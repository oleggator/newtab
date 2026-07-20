const STORAGE_KEY = 'selectedFolderId';

// Palette for letter-fallback tiles, keyed by domain hash
const LETTER_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFC048', '#51CF66',
  '#20C997', '#4DABF7', '#748FFC', '#CC5DE8',
  '#F06595', '#845EF7',
];

function colorForString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return LETTER_COLORS[Math.abs(h) % LETTER_COLORS.length];
}

function faviconUrl(pageUrl) {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(pageUrl)}&sz=64`;
}

// ── Render ───────────────────────────────────────────────────

function makeTile(bookmark) {
  const a = document.createElement('a');
  a.className = 'tile';
  a.href = bookmark.url;
  a.title = bookmark.title || bookmark.url;

  const iconDiv = document.createElement('div');
  iconDiv.className = 'tile-icon';

  const img = document.createElement('img');
  img.alt = '';
  img.src = faviconUrl(bookmark.url);
  img.addEventListener('error', () => {
    img.remove();
    const letter = document.createElement('span');
    letter.className = 'letter';
    letter.textContent = (bookmark.title || bookmark.url)[0];
    let domain = bookmark.url;
    try { domain = new URL(bookmark.url).hostname; } catch (_) {}
    iconDiv.style.backgroundColor = colorForString(domain);
    iconDiv.appendChild(letter);
  });
  iconDiv.appendChild(img);

  const label = document.createElement('span');
  label.className = 'tile-label';
  label.textContent = bookmark.title || bookmark.url;

  a.appendChild(iconDiv);
  a.appendChild(label);
  return a;
}

async function renderBookmarks(folderId) {
  const grid = document.getElementById('tiles-grid');
  grid.innerHTML = '';

  let children;
  try {
    const [node] = await browser.bookmarks.get(folderId);
    if (!node) throw new Error('Folder not found');
    children = await browser.bookmarks.getChildren(folderId);
  } catch (e) {
    // Folder may have been deleted — reset and show picker
    await browser.storage.local.remove(STORAGE_KEY);
    showSetup({ closable: false });
    return;
  }

  const bookmarks = children.filter(b => b.url);
  if (bookmarks.length === 0) {
    grid.innerHTML = '<p style="color:var(--label-muted);grid-column:1/-1;text-align:center;padding:60px 0">This folder has no bookmarks.</p>';
  } else {
    bookmarks.forEach(b => grid.appendChild(makeTile(b)));
  }

  const [folderNode] = await browser.bookmarks.get(folderId);
  document.getElementById('folder-label').textContent = folderNode.title || 'Bookmarks';

  document.getElementById('main').classList.remove('hidden');
  closeModal();
}

// ── Folder picker ────────────────────────────────────────────

let pickedFolderId = null;

function buildFolderTree(nodes, depth, container, activeId = null) {
  for (const node of nodes) {
    if (node.url) continue; // skip non-folders

    // Skip the root virtual nodes (they have no title / are placeholders)
    const isRoot = depth === 0;

    if (!isRoot) {
      const item = document.createElement('div');
      item.className = 'folder-item' + (node.id === activeId ? ' selected' : '');
      item.style.paddingLeft = `${10 + (depth - 1) * 18}px`;
      item.dataset.id = node.id;

      const icon = document.createElement('span');
      icon.className = 'folder-icon';
      icon.textContent = '📁';

      const name = document.createElement('span');
      name.className = 'folder-name';
      name.textContent = node.title || 'Untitled Folder';

      item.appendChild(icon);
      item.appendChild(name);

      item.addEventListener('click', () => {
        document.querySelectorAll('.folder-item.selected').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        pickedFolderId = node.id;

        const btn = document.getElementById('save-btn');
        btn.disabled = false;
        btn.textContent = `Use "${node.title || 'Untitled Folder'}"`;
      });

      container.appendChild(item);
    }

    if (node.children) {
      buildFolderTree(node.children, depth + 1, container, activeId);
    }
  }
}

async function showSetup({ closable = true } = {}) {
  pickedFolderId = null;
  const treeEl = document.getElementById('folder-tree');
  treeEl.innerHTML = '';

  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Select a folder above';

  document.getElementById('close-btn').classList.toggle('hidden', !closable);

  const data = await browser.storage.local.get(STORAGE_KEY);
  const currentId = data[STORAGE_KEY] ?? null;

  const tree = await browser.bookmarks.getTree();
  buildFolderTree(tree, 0, treeEl, currentId);

  // Pre-select the active folder in the save button label
  if (currentId) {
    const activeItem = treeEl.querySelector(`[data-id="${currentId}"]`);
    if (activeItem) {
      const name = activeItem.querySelector('.folder-name').textContent;
      saveBtn.disabled = false;
      saveBtn.textContent = `Use "${name}"`;
      pickedFolderId = currentId;
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }

  openModal();
}

// ── Modal open / close ───────────────────────────────────────

function openModal() {
  document.getElementById('setup').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('setup').classList.add('hidden');
}

// ── Wiring ───────────────────────────────────────────────────

document.getElementById('save-btn').addEventListener('click', async () => {
  if (!pickedFolderId) return;
  await browser.storage.local.set({ [STORAGE_KEY]: pickedFolderId });
  await renderBookmarks(pickedFolderId);
});

document.getElementById('close-btn').addEventListener('click', closeModal);

// Click on backdrop (outside the panel) closes the modal
document.getElementById('setup').addEventListener('click', (e) => {
  if (e.target === document.getElementById('setup')) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

document.getElementById('folder-label').addEventListener('click', () => {
  showSetup({ closable: true });
});

// Entry point
(async () => {
  const data = await browser.storage.local.get(STORAGE_KEY);
  const folderId = data[STORAGE_KEY];
  if (folderId) {
    await renderBookmarks(folderId);
  } else {
    await showSetup({ closable: false });
  }
})();
