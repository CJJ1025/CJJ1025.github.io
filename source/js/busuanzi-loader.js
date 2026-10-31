/**
 * busuanzi 统计脚本延迟加载器
 *
 * 主题原本把 busuanzi 的统计脚本以 async 形式放在页面上，只要
 * busuanzi.ibruce.info 无法访问（连接卡住而不报错），window.load 事件
 * 就永远不会触发：浏览器标签页一直转圈，搜索按钮等依赖 load 的功能也
 * 不会初始化。这里改为在 window.load 之后才动态插入统计脚本，
 * 这样外网请求再慢也不会阻塞页面加载和搜索。
 */
(function () {
  var SRC = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js'

  function load () {
    var script = document.createElement('script')
    script.src = SRC
    script.async = true
    script.setAttribute('data-pjax', '')
    document.body.appendChild(script)
  }

  if (document.readyState === 'complete') {
    load()
  } else {
    window.addEventListener('load', load)
  }
})()
