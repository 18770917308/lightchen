;(function(global, $, Crop) {
    var defaultOpt = {
        /* 整个图片选择、裁剪、上传区域的最外围包裹元素id，默认TCrop */
        id: 'TCrop',
        /* 上传路径 */
        url: '',
        /* 允许上传的图片的后缀，暂时支持以下四种，其余格式图片未测试 */
        allowsuf: ['jpg', 'jpeg', 'png', 'gif'],
        /* JCrop参数设置 */
        cropParam: {
            minSize: [50, 50],          // 选框最小尺寸
            maxSize: [300, 300],        // 选框最大尺寸
            allowSelect: true,          // 允许新选框
            allowMove: true,            // 允许选框移动
            allowResize: true,          // 允许选框缩放
            dragEdges: true,            // 允许拖动边框
            onChange: function(c) {},   // 选框改变时的事件
            onSelect: function(c) {}    // 选框选定时的事件，参数c={x, y, x1, y1, w, h}
        },
        /* 是否进行裁剪，不裁剪则按原图上传，默认进行裁剪 */
        isCrop: true,
        /* 图片上传完成之后的回调，无论是否成功上传 */
        onComplete: function(data) {
            console.log('upload complete!');
        }
    };

    /* 记录jcrop实例 */
    var jcropApi;

    /* 创建Dom结构 */
    /* 完整DOM结构 --s-- */
    /*
    <iframe id="uploadIfr" name="uploadIfr" class="crop-upload-ifr"></iframe>
    <form action="index.html" enctype="multipart/form-data" method="post" target="uploadIfr">
        <input type="hidden" name="cropData">
        <div class="crop-picker-wrap">
            <button class="crop-picker" type="button">选择图片</button>
            <input type="file" id="file" class="crop-picker-file">
        </div>
        <div class="crop-wrapper">
            <div class="crop-container clearfix">
                <div class="crop-area-wrapper"><img src="" alt=""></div>
                <div class="crop-preview-wrapper"><img src="" alt=""></div>
            </div>
            <div class="crop-operate">
                <div class="crop-save">上传原图</div>
                <div class="crop-save">保存截图</div>
                <div class="crop-cancel">取消</div>
            </div>
        </div>
    </form>
    */
    /* 完整DOM结构 --e-- */
    function _createDom($wrap, opt) {
        var accept = 'image/' + opt.allowsuf.join(', image/');
        var $ifr = $('<iframe id="uploadIfr" name="uploadIfr" class="crop-hidden"></iframe>');
        var $form = $('<form action="' + opt.url + '" enctype="multipart/form-data" method="post" target="uploadIfr"/>');
        var $cropDataInp = $('<input type="hidden" name="cropData">');
        var $picker = $('<div class="crop-picker-wrap"><button class="crop-picker" type="button">选择图片</button></div>');
        var $fileInp = $('<input type="file" id="file" accept="' + accept + '" class="crop-picker-file">');
        $picker.append($fileInp);
        $form.append($cropDataInp).append($picker);

        var $cropWrap = $('<div class="crop-wrapper crop-hidden"/>');
        var $cropArea = $('<div class="crop-area-wrapper"></div>');
        var $cropPreviewWrap = $('<div class="crop-preview-wrapper"></div>');
        var $cropPreview = $('<div class="crop-preview-container"/>');
        $cropPreviewWrap.append($cropPreview);
        var $cropContainer = $('<div class="crop-container"/>').append($cropArea).append($cropPreviewWrap);
        $cropWrap.append($cropContainer);
        // var $saveSource = $('<div class="crop-save">上传原图</div>');
        var $save = $('<div class="crop-save">保存</div>');
        var $cropCancel = $('<div class="crop-cancel">取消</div>');
        var $cropOpe = $('<div class="crop-operate"/>').append($save).append($cropCancel);

        if(!opt.isCrop) {
            $cropPreviewWrap.addClass('crop-hidden');
        }

        $cropWrap.append($cropOpe);
        $form.append($cropWrap);

        $wrap.append($ifr).append($form);

        return {
                $ifr: $ifr,
                $form: $form,
                $cropDataInp: $cropDataInp,
                $cropPicker: $picker,
                $fileInp: $fileInp,
                $cropWrap: $cropWrap,
                $cropArea: $cropArea,
                $cropPreview: $cropPreview,
                // $saveSource: $saveSource,
                $save: $save,
                $cancel: $cropCancel
            };
    };

    /*
     * 绑定事件
     * 
     */
    function _bind($cropObj, opt) {
        
        var $cropPicker = $cropObj.$cropPicker;
        var $fileInp = $cropObj.$fileInp;
        var $save = $cropObj.$save;
        var $cancel = $cropObj.$cancel;
        var $ifr = $cropObj.$ifr;
        
        $fileInp.change(function(eve) {
            if(!this.value) {return ;}
            var fileSuf = this.value.substring(this.value.lastIndexOf('.') + 1);
            if(!_checkSuf(fileSuf, opt.allowsuf)) {
                alert('只允许上传后缀名为' + opt.allowsuf.join(',') + '的图片');
                return ;
            }
            /* 进入裁剪流程 */
            _crop($cropObj, this);
            $cropPicker.addClass('crop-hidden').next().removeClass('crop-hidden');
        });

        $save.click(function(eve) {
            eve.preventDefault();
            Crop.upload();
        });

        $cancel.click(function(eve) {
            eve.preventDefault();
            Crop.cancel();
        });

        /* iframe的load应该延迟绑定，避免首次插入文档中加载完毕时触发load事件 */
        window.setTimeout(function() {
            $ifr.load(function() {
                var body = this.contentWindow.document.body;
                var text = body.innerText;
                opt.onComplete(text);
            });
        }, 100);        
    };

    /* 检查文件是否符合上传条件 */
    function _checkSuf(fileSuf, suffixs) {
        for(var i = 0, j = suffixs.length;i < j; i ++) {
            if(fileSuf.toLowerCase() == suffixs[i].toLowerCase()) {
                return true;
            }
        }
        return false;
    };

    /* 主要裁剪流程 */
    function _crop($cropObj, fileInp) {
        var cropArea = $cropObj.$cropArea.get(0);
        var cropPreview = $cropObj.$cropPreview.get(0);
        var opt = _getOpt();
        var jcropOpt = opt.cropParam;
        cropArea.innerHTML = '';
        if(fileInp.files && fileInp.files[0]) {
            var img = document.createElement('img');
            img.style.visibility = 'hidden';
            cropArea.appendChild(img);

            img.onload = function() {
                /* 在图片加载完成之后便可以获取原图的大小，根据原图大小和预览区域大小获取图片的缩放比例以及原图在预览时所展现的大小 */
                var scaleOpt = _getScale(cropArea.clientWidth, cropArea.clientHeight, img.offsetWidth, img.offsetHeight);
                img.setAttribute('style', 'position: absolute;visibility: visible;width: ' + scaleOpt.w + 'px;height: ' + scaleOpt.h + 'px');

                if(!opt.isCrop) {return ;}

                var cropPreviewImg = img.cloneNode(true);
                cropPreview.appendChild(cropPreviewImg);

                _startCrop(img, jcropOpt);

                /* 记录原始比例，上传数据需要还原实际裁剪尺寸 */
                Crop.ratio = scaleOpt.scale;
                /* 记录裁剪图片及裁剪预览图像对象，更新预览图时需要使用 */
                Crop.cropPreview = {
                    cropAreaImg: img,
                    cropPreviewImg: cropPreviewImg
                };
            };
            var fr = new FileReader();
            fr.onload = function(eve) {                
                img.src = eve.target.result;
            }
            fr.readAsDataURL(fileInp.files[0]);
        } else {
            var img = document.createElement('div');
            img.style.visibility = 'hidden';
            img.style.width = '100%';
            img.style.height = '100%';
            cropArea.appendChild(img);

            fileInp.select();
            var src = document.selection.createRange().text;
            // console.log(document.selection.createRange());

            var img_filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod='image',src='" + src + "')";            
            img.style.filter = img_filter;

            /* 需等待滤镜加载完毕之后才能进行下一步操作 */
            window.setTimeout(function() {
                _loadFiter(cropArea, img);
            }, 100);
        }        
    };

    /* 加载滤镜，等待两秒，超时则判定加载失败 */
    function _loadFiter(cropArea, img) {
        var time = 0;
        if(img.offsetWidth != cropArea.clientWidth) {
            /* 滤镜加载成功，进入裁剪流程 */
            _filterCrop(cropArea, img);
        } else {
            time ++;
            if(time < 20) {
                window.setTimeout(function() {
                    _loadFiter(cropArea, img);
                }, 100);
            } else {
                alert('图片加载失败，请重试！');
            }
        }
    };

    /* 使用滤镜的裁剪 */
    function _filterCrop(cropArea, img) {
        var scaleOpt = _getScale(cropArea.clientWidth, cropArea.clientHeight, img.offsetWidth, img.offsetHeight);
        /* 更改滤镜设置 */
        var s_filter = img.style.filter.replace(/sizingMethod='image'/g, "sizingMethod='scale'");
        var jcropOpt = _getOpt().cropParam;

        img.setAttribute('style', 'position: absolute;visibility: visible;width: ' + scaleOpt.w + 'px;height: ' + scaleOpt.h + 'px;filter: ' + s_filter);

        if(!_getOpt().isCrop) {return ;}

        var cropPreview = cropArea.nextSibling.firstChild;
        var cropPreviewImg = img.cloneNode(true);
        cropPreview.appendChild(cropPreviewImg);

        _startCrop(img, jcropOpt);

        /* 记录原始比例，上传数据需要还原实际裁剪尺寸 */
        Crop.ratio = scaleOpt.scale;
        /* 记录裁剪图片及裁剪预览图像对象，更新预览图时需要使用 */
        Crop.cropPreview = {
            cropAreaImg: img,
            cropPreviewImg: cropPreviewImg
        };
    };

    /* 开始裁剪，初始化裁剪插件 */
    function _startCrop(img, jcropOpt) {
        var imgW = img.offsetWidth;
        var imgH = img.offsetHeight;
        var minW = jcropOpt.minSize[0], minH = jcropOpt.minSize[1];
        var offsetWidth = (imgW / 2) - (minW / 2);
        var offsetHeight = (imgH / 2) - (minH / 2);
        var obj = {
            x: offsetWidth,
            y: offsetHeight,
            x2: offsetWidth + minW,
            y2: offsetHeight + minH,
            w: minW,
            h: minH
        };
        $(img).Jcrop(jcropOpt, function() {
            jcropApi = this;
            this.animateTo([obj.x, obj.y, obj.x2, obj.y2]);
        });
    };

    /* 获取配置参数opt */
    function _getOpt() {
        var id = Crop.crop.id;
        var cropDom = document.getElementById(id);
        var opt = $.data(cropDom, 'crop').opt;
        return opt;
    };

    /* 
     * 获取缩放比例 
     * 
     * 原始宽高vw,vh
     * 实际显示宽高sw,sh
     * 返回：
     * {w,h,scale:max(sw/vw,sh/vh)}
     * w,h均为缩放到sw、sh后的宽高
     */
    function _getScale(vw, vh, sw, sh) {
        vw = Number(vw);
        vh = Number(vh);
        sw = Number(sw);
        sh = Number(sh);
        if(vw <= 0 || vh <= 0) {
            console.log('参数不能为0');
            return false;
        }
        var wScale = sw / vw;
        var hScale = sh / vh;
        var scale = 1, w, h;

        if(wScale > hScale) {
            scale = wScale;
            w = vw;
            h = sh / scale;
        } else {
            scale = hScale;
            h = vh;
            w = sw / scale;
        }

        return {
            scale: scale,
            w: w,
            h: h
        };
    };

    /* 更新裁剪预览图 */
    function _updatePreview(c) {
        var cropAreaImg = Crop.cropPreview.cropAreaImg;
        var cropPreviewImg = Crop.cropPreview.cropPreviewImg;
        var $cropObj = $.data(document.getElementById(Crop.crop.id), 'crop').$cropObj;
        var $cropDataInp = $cropObj.$cropDataInp;
        var $cropPreview = $cropObj.$cropPreview;
        var $previewParent = $cropPreview.parent();
        var vw = $previewParent.width(), vh = $previewParent.height();
        var scaleOpt = _getScale(vw, vh, c.w, c.h);
        $cropPreview.width(scaleOpt.w);
        $cropPreview.height(scaleOpt.h);
        var width = $(cropAreaImg).width() / scaleOpt.scale;
        var height = $(cropAreaImg).height() / scaleOpt.scale;
        var top = -(c.y / scaleOpt.scale);
        var left = -(c.x / scaleOpt.scale);
        cropPreviewImg.style.width = width + 'px';
        cropPreviewImg.style.height = height + 'px';
        cropPreviewImg.style.top = top + 'px';
        cropPreviewImg.style.left = left + 'px';
        _setCropData($cropDataInp, c);
    };

    /* 设置裁剪数据 */
    function _setCropData($cropDataInp, c) {
        var ratio = Crop.ratio;
        var data = {
            x: c.x * ratio,
            y: c.y * ratio,
            w: c.w * ratio,
            h: c.h * ratio
        };
        
        var dataJson = JSON.stringify(data);
        $cropDataInp.val(dataJson);
    };

    /* 扩展配置参数，尤其是Jcrop裁剪参数中的onSelect,onChange参数 */
    function _extendOpt(opt) {
        opt = $.extend(true, {}, defaultOpt, opt);
        var select = opt.cropParam.onSelect;
        var change = opt.cropParam.onChange;
        if(Object.prototype.toString.call(select) == '[object Function]') {
            opt.cropParam.onSelect = function(c) {
                _updatePreview.call(jcropApi, c);
                select.call(jcropApi, c);
            };
        } else {
            opt.cropParam.onSelect = _updatePreview;
        }
        if(Object.prototype.toString.call(change) == '[object Function]') {
            opt.cropParam.onChange = function(c) {
                _updatePreview.call(jcropApi, c);
                change.call(jcropApi, c);
            }
        } else {
            opt.cropParam.onChange = _updatePreview;
        }
        return opt;
    };

    /* 初始化上传裁剪区域 */
    function init(opt) {
        var opt = _extendOpt(opt);
        var $uploadCropWrap = $('#' + opt.id);
        var hasDom = true;
        if($uploadCropWrap.length == 0) {
            $uploadCropWrap = $('<div id="' + opt.id + '" />');
            hasDom = false;
        }

        /* 清空Dom原有内部结构 */
        $uploadCropWrap.html('');
        var $cropObj = _createDom($uploadCropWrap, opt);

        $.data($uploadCropWrap.get(0), 'crop', {opt: opt, $cropObj: $cropObj});
        hasDom || $('body').append($uploadCropWrap);

        _bind($cropObj, opt);

        Crop.crop = {id: opt.id, hasDom: hasDom};
    };

    /* 上传 */
    function upload() {
        var id = (Crop.crop && Crop.crop.id) || '';
        var dom = document.getElementById(id);
        if(!dom) {
            return ;
        }
        var form = $.data(dom, 'crop').$cropObj.$form.get(0);
        form.submit();
    };

    /* 取消裁剪 */
    function cancel() {
        var id = (Crop.crop && Crop.crop.id) || "";
        var dom = document.getElementById(id);
        if(!dom) {
            return ;
        }
        var $cropObj = $.data(dom, 'crop').$cropObj;
        $cropObj.$cropWrap.addClass('crop-hidden');
        $cropObj.$cropPicker.removeClass('crop-hidden');
    };

    /* 销毁上传裁剪区域 */
    function destroy() {
        var crop = Crop.crop || {};
        var $cropWrap = $('#' + crop.id);
        if(crop.hasDom === true) {
            $cropWrap.html('');
        } else {
            $cropWrap.remove();
        }
    };

    if($.isEmptyObject(Crop)) {
        global.Crop = Crop = {
            init: init,
            upload: upload,
            cancel: cancel,
            destroy: destroy,
            crop: {}
        };
    } else {
        Crop = $.extend(Crop, {
            init: init,
            upload: upload,
            cancel: cancel,
            destroy: destroy,
            crop: {}
        });
    }
})(window, jQuery, window.Crop || {});