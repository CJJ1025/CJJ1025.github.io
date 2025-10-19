// Bing API 背景图功能实现
(function() {
  // 确保只在首页执行
  if (!document.body.classList.contains('home-page')) return;
  
  // 从配置中获取参数（这里使用默认值，实际使用时会从配置中读取）
  const config = {
    type: 'daily', // daily 或 random
    position: 'center', // 图片裁剪方式
    opacity: 0.5, // 透明度
    blur: '10px' // 模糊度
  };
  
  // 创建背景元素
  function createBackgroundElement() {
    const bgElement = document.createElement('div');
    bgElement.id = 'bing-bg';
    bgElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: ${config.position};
      opacity: ${config.opacity};
      filter: blur(${config.blur});
      z-index: -2;
      transform: scale(1.1);
    `;
    document.body.appendChild(bgElement);
    return bgElement;
  }
  
  // 获取Bing每日一图
  function getBingImage() {
    // 使用新的API，直接返回图片URL
    const apiUrl = config.type === 'daily' 
      ? 'https://bing.img.run/uhd.php' 
      : 'https://bing.img.run/rand_uhd.php';
    
    // 直接使用API URL作为图片源，不需要JSON解析
    const bgElement = createBackgroundElement();
    bgElement.style.backgroundImage = `url('${apiUrl}')`;
    
    // 添加加载动画
    bgElement.style.transition = 'opacity 1s ease-in-out';
    
    // 测试图片加载是否成功
    const img = new Image();
    img.onload = function() {
      console.log('Bing背景图加载成功');
    };
    img.onerror = function() {
      console.error('Bing背景图加载失败，尝试备用API...');
      // 尝试备用API
      const fallbackApi = 'https://api.ixiaowai.cn/api/api.php';
      bgElement.style.backgroundImage = `url('${fallbackApi}')`;
    };
    img.src = apiUrl;
  }
  
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', getBingImage);
  } else {
    getBingImage();
  }
})();