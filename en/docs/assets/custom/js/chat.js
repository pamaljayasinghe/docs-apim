document.addEventListener('DOMContentLoaded', function() {
  // --- DOM Element Selectors ---
  const chatToggle = document.getElementById('site-chat-toggle');
  const chatPanel = document.getElementById('site-chat');
  const closeChatBtn = chatPanel?.querySelector('.site-chat__close[aria-label="Close chat"]');
  
  const openSplitViewBtn = document.getElementById('open-split-view');
  const clearChatBtn = document.getElementById('clear-chat-history');
  const splitViewContainer = document.getElementById('split-view-container');
  
  const splitPageIframe = document.getElementById('split-page-iframe');
  const chatResizeHandle = document.getElementById('chat-resize-handle');
  
  const footerEl = document.querySelector('footer.md-footer') || document.querySelector('footer');

  // --- Chat iframe reference ---
  let chatIframe = null;

  function initializeChatIframe() {
    if (!chatIframe) {
      chatIframe = document.querySelector('#site-chat iframe');
    }
  }

  // --- State ---
  let isSplitViewMode = false;
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

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
  // Use CSS classes instead of moving iframe to prevent reload/request interruption
  function openSplitView() {
    if (splitPageIframe) {
      splitPageIframe.src = window.location.href;
    }
    if (splitViewContainer) {
      splitViewContainer.classList.add('active');
    }
    // Add class to reposition chat panel into split view
    if (chatPanel) {
      chatPanel.classList.add('in-split-view');
      chatPanel.classList.add('open'); // Keep it visible
    }
    document.documentElement.classList.add('split-view-is-active');
    document.body.classList.add('split-view-is-active');
    isSplitViewMode = true;
  }

  function closeSplitView() {
    if (splitViewContainer) {
      splitViewContainer.classList.remove('active');
    }
    if (splitPageIframe) {
      splitPageIframe.src = 'about:blank'; // Clear the iframe
    }
    if (chatPanel) {
      chatPanel.classList.remove('in-split-view');
      chatPanel.classList.remove('open'); // Hide it
      chatPanel.style.width = ''; // Reset width to default
    }
    // Reset left panel width
    const leftPanel = document.querySelector('.split-view-left');
    if (leftPanel) {
      leftPanel.style.width = '';
    }
    document.documentElement.classList.remove('split-view-is-active');
    document.body.classList.remove('split-view-is-active');
    isSplitViewMode = false;
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
    closeChatBtn.addEventListener('click', () => {
      if (isSplitViewMode) {
        closeSplitView();
      } else {
        closeChat();
      }
    });
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

  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent any default button action
      
      // This sends the "clear" signal to the iframe by changing the URL hash.
      // The code inside the iframe is expected to listen for this signal.
      if (chatIframe) {
        chatIframe.src = chatIframe.src.split('#')[0] + '#clearHistory_' + Date.now();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && splitViewContainer?.classList.contains('active')) {
      closeSplitView();
    }
  });

  // --- Resize Logic for Chat Panel in Split View ---
  let resizeOverlay = null;

  function createResizeOverlay() {
    if (!resizeOverlay) {
      resizeOverlay = document.createElement('div');
      resizeOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;cursor:ew-resize;';
    }
    document.body.appendChild(resizeOverlay);
  }

  function removeResizeOverlay() {
    if (resizeOverlay && resizeOverlay.parentNode) {
      resizeOverlay.parentNode.removeChild(resizeOverlay);
    }
  }

  function startResize(e) {
    if (!isSplitViewMode) return;
    isResizing = true;
    startX = e.clientX;
    startWidth = chatPanel.offsetWidth;
    chatResizeHandle.classList.add('active');
    createResizeOverlay();
    e.preventDefault();
    e.stopPropagation();
  }

  function doResize(e) {
    if (!isResizing) return;
    e.preventDefault();
    const deltaX = startX - e.clientX;
    const newWidth = Math.max(350, Math.min(startWidth + deltaX, window.innerWidth - 300));
    chatPanel.style.width = `${newWidth}px`;
    // Adjust left panel width accordingly
    const leftPanel = document.querySelector('.split-view-left');
    if (leftPanel) {
      leftPanel.style.width = `calc(100% - ${newWidth}px)`;
    }
  }

  function stopResize() {
    if (isResizing) {
      isResizing = false;
      chatResizeHandle.classList.remove('active');
      removeResizeOverlay();
    }
  }

  if (chatResizeHandle) {
    chatResizeHandle.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('mouseleave', stopResize);
  }

  const debouncedAdjust = debounce(adjustPositionForFooter, 50);
  window.addEventListener('scroll', debouncedAdjust, { passive: true });
  window.addEventListener('resize', debouncedAdjust);
  window.addEventListener('load', adjustPositionForFooter);
  adjustPositionForFooter(); // Initial call

  // Initialize chat iframe reference
  initializeChatIframe();

  // --- Listen for postMessage from chatbot iframe to open links in split view ---
  window.addEventListener('message', function(event) {
    // Handle link opening in split view
    if (event.data && event.data.type === 'OPEN_LINK_IN_SPLIT_VIEW') {
      const url = event.data.url;
      if (url) {
        openLinkInSplitView(url);
      }
    }
  });

  function openLinkInSplitView(url) {
    // Transform external doc URLs to use current origin so they can load in iframe
    let finalUrl = url;
    try {
      const urlObj = new URL(url, window.location.href);
      
      // If URL points to external docs domain, rewrite to current origin
      // This handles cases like https://apim.docs.wso2.com/en/latest/... -> http://localhost:8000/en/latest/...
      if (urlObj.hostname !== window.location.hostname) {
        // Extract the path and use current origin
        finalUrl = window.location.origin + urlObj.pathname + urlObj.search + urlObj.hash;
      } else {
        finalUrl = urlObj.href;
      }
    } catch (e) {
      // Fallback: prepend current origin if URL parsing fails
      finalUrl = window.location.origin + (url.startsWith('/') ? url : '/' + url);
    }
    
    // If split view is already active, just update the left iframe
    if (splitViewContainer?.classList.contains('active')) {
      if (splitPageIframe) {
        splitPageIframe.src = finalUrl;
      }
    } else {
      // Open split view with the link in the left panel
      if (splitPageIframe) {
        splitPageIframe.src = finalUrl;
      }
      if (splitViewContainer) {
        splitViewContainer.classList.add('active');
      }
      document.documentElement.classList.add('split-view-is-active');
      document.body.classList.add('split-view-is-active');
      closeChat();
      moveChatToSplitView();
    }
  }
});
