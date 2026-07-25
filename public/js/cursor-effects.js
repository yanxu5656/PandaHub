// 熊猫爪爪鼠标 + 竹叶飘尾效果

(function() {
  const LEAF_EMOJIS = ['🍃', '🌿', '🎋', '☘️'];
  let lastX = 0;
  let lastY = 0;
  let leafCount = 0;
  const MAX_LEAVES = 20;

  // 创建竹叶
  function createLeaf(x, y) {
    if (leafCount >= MAX_LEAVES) return;

    const leaf = document.createElement('div');
    leaf.className = 'bamboo-leaf';
    leaf.textContent = LEAF_EMOJIS[Math.floor(Math.random() * LEAF_EMOJIS.length)];

    // 随机偏移方向
    const dx = (Math.random() - 0.5) * 80;
    const dy = Math.random() * 60 + 20;
    const rot = (Math.random() - 0.5) * 360;

    leaf.style.left = x + 'px';
    leaf.style.top = y + 'px';
    leaf.style.setProperty('--dx', dx + 'px');
    leaf.style.setProperty('--dy', dy + 'px');
    leaf.style.setProperty('--rot', rot + 'deg');

    document.body.appendChild(leaf);
    leafCount++;

    // 动画结束后移除
    setTimeout(() => {
      leaf.remove();
      leafCount--;
    }, 1500);
  }

  // 节流
  let lastTime = 0;
  const THROTTLE = 80; // 每80ms最多一片叶子

  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 只在移动一定距离后才生成叶子
    if (now - lastTime > THROTTLE && dist > 20) {
      createLeaf(e.clientX, e.clientY);
      lastTime = now;
      lastX = e.clientX;
      lastY = e.clientY;
    }
  });
})();
