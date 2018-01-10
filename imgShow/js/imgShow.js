/*$.extend({
    showImg: function(imgItem,speed,len) {
        var index = 1;
			function show(){
				imgItem.eq(index).css("display","block").siblings().css("display","none");
				index++;
				if(index==len){
					index=0;
				}
			};
			setInterval(show,speed);
    }
});*/
/*
*imgItem:轮播的每项图片的外层的jquery对象 $("li") 例 <li><img src="" />
*speed:轮播时间间隔
*len：图片数量
* 
 */
(function($){
	$.fn.extend({
		"showImg":function(imgItem,speed,len){
			if(imgItem instanceof jQuery && speed>100 && len>1){
				var index = 1;
				function show(){
					imgItem.eq(index).css("display","block").siblings().css("display","none");
					index++;
					if(index==len){
						index=0;
					}
				};
				setInterval(show,speed);
			}
			
		},
		"bigSize":function(opt){
			console.log(opt);
			var defaults = {
				'color':'red',
				'fontSize':'18px'
			}
			var settings = $.extend({},defaults,opt);///使用jQuery.extend 覆盖插件默认参数
			return this.each(function(){
				var $this = $(this);
				$this.css({
					'color':settings.color,
					'fontSize':settings.fontSize
				})
			})
		}
	})
})(window.jQuery)
