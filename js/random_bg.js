// 简化版随机背景图片加载脚本
document.addEventListener('DOMContentLoaded', function() {
  const pageHeader = document.getElementById('page-header');
  if (!pageHeader) return;
  
  // 直接使用t.alcy.cc/fj作为随机背景图源
  const randomImageUrl = 'https://t.alcy.cc/fj';
  
  // 基本错误处理：验证图片可用性并提供备用方案
  const img = new Image();
  img.onerror = function() {
    console.log('随机图片加载失败，使用备用图片');
    const fallbackImages = ['https://pic1.imgdb.cn/item/68fceeb33203f7be009ed4c5.jpg', '/img/bdg.jpg'];
    const randomFallback = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    pageHeader.style.backgroundImage = `url(${randomFallback})`;
  };
  
  // 直接设置背景图片
  pageHeader.style.backgroundImage = `url(${randomImageUrl})`;
  
  // 设置图片源以触发错误处理（如果需要）
  img.src = randomImageUrl;
});