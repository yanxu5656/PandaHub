// 页面过渡动画 + 预加载

(function() {
  // 1. View Transitions API 支持检测
  const supportsViewTransitions = 'startViewTransition' in document;

  // 2. 拦截链接点击，实现平滑过渡
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;

    e.preventDefault();

    if (supportsViewTransitions) {
      document.startViewTransition(() => {
        window.location.href = href;
      });
    } else {
      // 降级：添加淡出效果
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.15s ease';
      setTimeout(() => {
        window.location.href = href;
      }, 150);
    }
  });

  // 3. 页面加载时淡入
  if (supportsViewTransitions) {
    // View Transitions 会自动处理
  } else {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.2s ease';
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });
  }

  // 4. 鼠标悬停预加载
  let prefetchedUrls = new Set();

  document.addEventListener('mouseover', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || prefetchedUrls.has(href)) return;

    // 预加载页面
    const prefetchLink = document.createElement('link');
    prefetchLink.rel = 'prefetch';
    prefetchLink.href = href;
    document.head.appendChild(prefetchLink);
    prefetchedUrls.add(href);
  });

  // 5. 添加页面过渡样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes fadeSlideOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-8px); }
    }

    /* View Transitions 自定义样式 */
    ::view-transition-old(root) {
      animation: fadeSlideOut 0.2s ease;
    }

    ::view-transition-new(root) {
      animation: fadeSlideIn 0.3s ease;
    }

    /* 页面加载动画 */
    .page-enter {
      animation: fadeSlideIn 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  // 6. 标记当前页面为已进入
  document.body.classList.add('page-enter');
})();
