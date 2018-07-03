sprites-loader
___
## 说明
this plugin be based on isprite-loader.

基于isprite-loader，修改了原插件的几个问题。
1. windows 下分隔符问题
2. 重新修改的css中background-position属性不对
3. 合成图片过程时好时坏，把异步操作改成串行操作，修复问题

## 使用方法
webpack配置方法
````js
module:{
      rules:[
          {
              test:/\.(scss|css)$/,
              use: ExtractTextPlugin.extract({
                fallback: "style-loader",
                publicPath: '../../',
                use: [{
                  loader:'css-loader'
                },{
                  loader:'isprite-loader',
                  options:{
                    outputPath:'./src/assets/img/',
                    scale:0.3333333 //如果提供的icon是3倍图，合成之后的图片样式会乘以0.33333，默认是1
                  }
                },{
                  loader:'sass-loader'
                }],
              })
          },
      ]
}
````

源文件
````css
.weibo {
    background-image: url("../assets/sprite/login/weibo.png?_sprite"); /*图片是48px*48px*/
}
````


合成之后样式

````css
.container-foo .weibo {
  background-image: url(/img/login.png); /*login.png是合成后的图片*/
}
.container-foo .qq,
.container-foo .weibo {
  background-size: 16px 84px;
  width: 16px;
  height: 16px;
}
````

