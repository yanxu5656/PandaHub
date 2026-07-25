// 页面过渡动画

(function() {
  // 1. 鼠标悬停预加载
  let prefetchedUrls = new Set();

  document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || prefetchedUrls.has(href)) return;

    const prefetchLink = document.createElement('link');
    prefetchLink.rel = 'prefetch';
    prefetchLink.href = href;
    document.head.appendChild(prefetchLink);
    prefetchedUrls.add(href);
  });

  // 2. 拦截链接点击
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;

    e.preventDefault();

    // 检查是否支持 View Transitions
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        window.location.href = href;
      });
    } else {
      // 不支持则直接跳转
      window.location.href = href;
    }
  });

  // 3. 添加 View Transitions 样式
  if (document.startViewTransition) {
    const style = document.createElement('style');
    style.textContent = `
      ::view-transition-old(root) {
        animation: fadeOut 0.15s ease;
      }
      ::view-transition-new(root) {
        animation: fadeIn 0.2s ease;
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
})();
