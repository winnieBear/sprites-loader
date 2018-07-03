
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const Spritesmith = require('spritesmith');
const loaderUtils = require('loader-utils');
const charSep = path.sep;
const spritesmith = new Spritesmith();

module.exports = function(content) {
    let item, assets = [],
        imagesPathMap = [],
        callback = this.async(),
        resourcePath = this.resourcePath,
        options = loaderUtils.getOptions(this) || {},
        scale = options.scale || 1,
        spriteImageRegexp = /url\((?:"|')(\S+)\?\_sprite(?:"|')\)/g,
        context =  options.context || this.rootContext || this.options && this.options.context,
        sourceRoot = path.dirname(path.relative(context, resourcePath));

    while((item = spriteImageRegexp.exec(content))) {
        if(item && item[1]) {
           let assetPath = loaderUtils.stringifyRequest(this, item[1]);
           let absolutePath = path.resolve(context, sourceRoot, JSON.parse(assetPath));
           let dirPath =  path.dirname(assetPath);
           let curDirPath = dirPath.substr(dirPath.lastIndexOf(charSep)+1);
           assets.push(absolutePath);
           imagesPathMap.push({
               path: absolutePath,
               url: item[0]
           })
        }
    }

    if(!assets.length) {
        callback(null, content);
        return;
    }

    let arrSprite=[],assetsArr=[];
    assets.forEach((element)=>{
        let dirPath = path.dirname(element);
        let curDirPath = dirPath.substr(dirPath.lastIndexOf(charSep)+1);
        if(arrSprite.indexOf(curDirPath)<0){
            arrSprite.push(curDirPath);
            assetsArr[arrSprite.length-1]=[];
        }
        assetsArr[arrSprite.length-1].push(element);

    })

  let getTask = (content, _index) => {
    let element = assetsArr[ _index ];
    return new Promise((resolve, reject) => {
      Spritesmith.run({
        src: element,
        algorithm: 'top-down',
        padding: 20
      }, function handleResult(err, result) {
        if (err) {
          return reject(err);
        }

        let dirPath = path.dirname(element[ 0 ]);
        let curDirPath = dirPath.substr(dirPath.lastIndexOf(charSep) + 1);
        let outputPath = options.outputPath;
        if (outputPath) {
          outputPath = path.join(context, outputPath);
        }
        outputPath = outputPath || dirPath;
        mkdirp(outputPath, function (err) {
          if (err) {
            return reject(err);
          }
          let name = curDirPath + '.png';
          let url = loaderUtils.interpolateName(this, name, {
            context,
            content: result.image
          });
          let spritesImgPath = path.join(outputPath, url);
          fs.writeFileSync(spritesImgPath, result.image);

          spriteImageRegexp.lastIndex = 0;
          let spriteRelativePath = path.relative(path.dirname(resourcePath), spritesImgPath);
          spriteRelativePath = loaderUtils.stringifyRequest(this, spriteRelativePath);
          spriteRelativePath = JSON.parse(spriteRelativePath);


          let match = null;
          let propWidth = result.properties.width;
          let propHeight = result.properties.height;

          propWidth = propWidth * scale;
          propHeight = propHeight * scale;

          let backgroundSize = 'background-size:' + propWidth + 'px ' + propHeight + 'px;';
          let lastIndex = 0;
          imagesPathMap.forEach(function (item) {
            if (element.indexOf(item.path) >= 0) {
              let index = content.indexOf(item.url, lastIndex);
              let len = item.url.length;
              lastIndex = index + len;

              let preContent = content.substring(0, index);
              let afterContent = content.substring(index);
              let matchLength = len;
              let i;
              for (i = matchLength; i < afterContent.length; i++) {
                if (afterContent.charAt(i) == ';' || afterContent.charAt(i) == '}') {
                  break;
                }
              }

              let end;

              let absolutePathItem = item.path;
              let coordinates = result.coordinates;
              let image = coordinates[ absolutePathItem ];
              let imageW = image.width;
              let imageH = image.height;

              imageW = imageW * scale;
              imageH = imageH * scale;


              let imgWidth = 'width:' + imageW + 'px;';
              let imgHeight = 'height:' + imageH + 'px;';

              if (i < afterContent.length) {

                if (afterContent[ i ] == ';') {
                  end = i + 1;
                  afterContent = afterContent.substring(0, end) + backgroundSize + imgWidth + '\n' + imgHeight + afterContent.substring(end);
                } else {
                  end = i;
                  afterContent = afterContent.substring(0, end) + ';\n' + backgroundSize + imgWidth + '\n' + imgHeight + afterContent.substring(end);
                }

              }
              let imagePosX = image.x;
              let imagePosY = image.y;

              imagePosX = imagePosX * scale;
              imagePosY = imagePosY * scale;

              let imageX = image.x == 0 ? ' 0' : ' -' + imagePosX + 'px';
              let imageY = image.y == 0 ? ' 0' : ' -' + imagePosY + 'px';
              let imagePosition = '';
              if (image.x || image.y) {
                imagePosition = imageX + imageY;
              }

              let cssVal = 'url("' + spriteRelativePath + '");' + (imagePosition ? ';background-position:' + imagePosition : '');

              afterContent = cssVal + afterContent.substring(matchLength);
              content = preContent + afterContent;
            }

          });

          resolve(content);
        })//mkdirp end
      });
    });
  };

  let p = Promise.resolve(content);
  for (let _index=0; _index < assetsArr.length; _index++){
    p = p.then((content) => {
      return getTask(content, _index);
    });
  }

  p.then((content) => {
    // console.log(content)
    callback(null, content);
  })
  .catch((err) => {
    // console.error(err);
    callback(err, '');
  })

}