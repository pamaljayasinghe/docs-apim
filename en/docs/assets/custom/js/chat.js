document.addEventListener('DOMContentLoaded', function() {
  // --- DOM Element Selectors ---
  const chatToggle = document.getElementById('site-chat-toggle');
  const chatPanel = document.getElementById('site-chat');
  const closeChatBtn = chatPanel?.querySelector('.site-chat__close[aria-label="Close chat"]');
  
  const openSplitViewBtn = document.getElementById('open-split-view');
  const splitViewContainer = document.getElementById('split-view-container');
  const closeSplitViewBtn = document.getElementById('close-split-view');
  
  const splitPageIframe = document.getElementById('split-page-iframe');
  const splitPanel = document.getElementById('split-view-panel');
  const resizeHandle = document.getElementById('resize-handle');
  
  const footerEl = document.querySelector('footer.md-footer') || document.querySelector('footer');

  // --- Chat iframe management ---
  let chatIframe = null;
  const chatBodyContainer = document.querySelector('#site-chat .site-chat__body');
  const splitChatContainer = document.querySelector('#split-view-panel .split-view-content-wrapper');

  // Initialize chat iframe
  function initializeChatIframe() {
    if (!chatIframe) {
      chatIframe = document.querySelector('#site-chat iframe');
    }
  }

  // --- State ---
  let isResizing = false;
  let startX = 0, startY = 0, startWidth = 0, startHeight = 0;
  let isSplitViewMode = false;

  // --- Utility Functions ---
  function debounce(fn, wait) {
    let t;
    return function() {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  // Add a class to the body if it's inside an iframe
  if (window.self !== window.top) {
    document.body.classList.add('in-iframe');
  }
  function openChat() {
    if (chatPanel && !isSplitViewMode) {
      chatPanel.classList.add('open');
      chatPanel.setAttribute('aria-hidden', 'false');
    }
  }

  function closeChat() {
    if (chatPanel && !isSplitViewMode) {
      chatPanel.classList.remove('open');
      chatPanel.setAttribute('aria-hidden', 'true');
    }
  }

  // --- Split View Logic ---
  function moveChatToSplitView() {
    initializeChatIframe();
    if (chatIframe && splitChatContainer) {
      splitChatContainer.appendChild(chatIframe);
      isSplitViewMode = true;
    }
  }

  function moveChatBackToPanel() {
    if (chatIframe && chatBodyContainer) {
      chatBodyContainer.appendChild(chatIframe);
      isSplitViewMode = false;
    }
  }

  function openSplitView() {
    if (splitPageIframe) {
      splitPageIframe.src = window.location.href;
    }
    if (splitViewContainer) {
      splitViewContainer.classList.add('active');
    }
    document.documentElement.classList.add('split-view-is-active');
    document.body.classList.add('split-view-is-active');
    closeChat();
    moveChatToSplitView();
  }

  function closeSplitView() {
    if (splitViewContainer) {
      splitViewContainer.classList.remove('active');
    }
    if (splitPageIframe) {
      splitPageIframe.src = 'about:blank'; // Clear the iframe
    }
    document.documentElement.classList.remove('split-view-is-active');
    document.body.classList.remove('split-view-is-active');
    moveChatBackToPanel();
  }

  // --- Footer Overlap Adjustment ---
  function adjustPositionForFooter() {
    if (!footerEl || !chatToggle || !chatPanel) return;

    const defaultToggleBottom = 16; // 1rem
    const defaultPanelBottom = 88;  // ~5.5rem
    const rect = footerEl.getBoundingClientRect();
    const overlap = Math.max(0, window.innerHeight - rect.top);

    if (overlap > 0) {
      const toggleBottom = overlap + defaultToggleBottom;
      chatToggle.style.bottom = `${toggleBottom}px`;
      
      const toggleHeight = chatToggle.offsetHeight || 56;
      const panelBottom = toggleBottom + toggleHeight + 8;
      chatPanel.style.bottom = `${panelBottom}px`;
    } else {
      chatToggle.style.bottom = `${defaultToggleBottom}px`;
      chatPanel.style.bottom = `${defaultPanelBottom}px`;
    }
  }

  // --- Resizable Panel Logic ---
  function startResize(e) {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    
    if (window.innerWidth > 768) {
      startWidth = splitPanel.offsetWidth;
    } else {
      startHeight = splitPanel.offsetHeight;
    }
    
    splitViewContainer.classList.add('resizing');
    resizeHandle.classList.add('active');
    e.preventDefault();
  }

  function doResize(e) {
    if (!isResizing) return;

    const newX = e.clientX;
    const newY = e.clientY;

    requestAnimationFrame(() => {
      if (window.innerWidth > 768) { // Horizontal
        const deltaX = startX - newX;
        const newWidth = Math.max(200, Math.min(startWidth + deltaX, splitViewContainer.offsetWidth - 200));
        splitPanel.style.width = `${newWidth}px`;
      } else { // Vertical
        const deltaY = startY - newY;
        const newHeight = Math.max(200, Math.min(startHeight + deltaY, splitViewContainer.offsetHeight - 200));
        splitPanel.style.height = `${newHeight}px`;
      }
    });
  }

  function stopResize() {
    if (isResizing) {
      isResizing = false;
      splitViewContainer.classList.remove('resizing');
      resizeHandle.classList.remove('active');
    }
  }

  // --- Event Listeners ---
  if (chatToggle) {
    chatToggle.addEventListener('click', () => {
      if (isSplitViewMode) {
        // If in split view, close split view and open regular chat
        closeSplitView();
        setTimeout(() => openChat(), 100); // Small delay for smooth transition
      } else if (chatPanel?.classList.contains('open')) {
        closeChat();
      } else {
        openChat();
      }
    });
  }

  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', closeChat);
  }

  document.addEventListener('click', (e) => {
    if (chatPanel?.classList.contains('open') && !chatPanel.contains(e.target) && !chatToggle.contains(e.target)) {
      closeChat();
    }
  });

  if (openSplitViewBtn) {
    openSplitViewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSplitView();
    });
  }

  if (closeSplitViewBtn) {
    closeSplitViewBtn.addEventListener('click', closeSplitView);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && splitViewContainer?.classList.contains('active')) {
      closeSplitView();
    }
  });

  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('mouseleave', stopResize); // Also stop if mouse leaves window
  }

  const debouncedAdjust = debounce(adjustPositionForFooter, 50);
  window.addEventListener('scroll', debouncedAdjust, { passive: true });
  window.addEventListener('resize', debouncedAdjust);
  window.addEventListener('load', adjustPositionForFooter);
  adjustPositionForFooter(); // Initial call
  
  // Initialize chat iframe reference
  initializeChatIframe();
});
