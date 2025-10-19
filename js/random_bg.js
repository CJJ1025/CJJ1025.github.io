// 随机背景图片加载脚本
// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
  // 获取页面头部元素
  const pageHeader = document.getElementById('page-header');
  if (!pageHeader) return;
  
  // 选择一个随机API
  // 这里使用picsum.photos，它通常不会有跨域问题
  // 使用picsum.photos API，它通常不会有跨域问题
  const randomImageUrl = 'https://t.alcy.cc/fj';
  
  // 创建图片对象来预加载
  const img = new Image();
  img.onload = function() {
    // 图片加载成功后，更新页面头部背景
    if (pageHeader.style.backgroundImage) {
      pageHeader.style.backgroundImage = `url(${randomImageUrl})`;
    }
  };
  
  img.onerror = function() {
    console.log('随机图片加载失败，使用备用图片');
    // 加载失败时使用备用本地图片
    const fallbackImages = ['/img/gcmm.png', '/img/bdg.jpg'];
    const randomFallback = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    if (pageHeader.style.backgroundImage) {
      pageHeader.style.backgroundImage = `url(${randomFallback})`;
    }
  };
  
  // 设置图片源开始加载
  img.src = randomImageUrl;
  
  // 直接设置背景图片（不等待预加载完成，提高用户体验）
  setTimeout(function() {
    if (pageHeader.style.backgroundImage) {
      pageHeader.style.backgroundImage = `url(${randomImageUrl})`;
    }
  }, 300);
});