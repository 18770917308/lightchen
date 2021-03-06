
(function () {
	/**!
	** @author: zhangxinxu(.com) 2017-12-09
	** @description: http://www.zhangxinxu.com/wordpress/?p=6594
	** @licence: MIT licence
	*/
	window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
	
	var points = [];

	(function () {
		// 计算像素点需要的canvas
		var canvas = document.createElement('canvas');
		var context = canvas.getContext('2d');
		var width = 320;
		var height = 320;
		canvas.width = width;
		canvas.height = height;
		
		// get points方法
		var eleFile = document.getElementById('file');
		var eleLetter = document.getElementById('letter');
		
		// 图片尺寸限制在320*320里面
		// 压缩图片需要的一些元素和对象
		var reader = new FileReader(), img = new Image();
		
		// 选择的文件对象
		var file = null;
		
		// base64地址图片加载完毕后
		img.onload = function () {
			// 图片原始尺寸
			var originWidth = this.width;
			var originHeight = this.height;
		
			// 目标尺寸
			var targetWidth = originWidth, targetHeight = originHeight;
		
			// 按照canavs尺寸调整大小
			if (targetWidth > targetHeight)  {
				targetWidth = width;
				targetHeight = targetWidth * (originHeight / originWidth);
			} else {
				targetHeight = height;
				targetWidth = targetHeight * (originWidth / originHeight);
			}
		
			// 清除画布
			context.clearRect(0, 0, width, height);
			// 图片压缩
			context.drawImage(img, (width - targetWidth) / 2, (height - targetHeight) / 2, targetWidth, targetHeight);
			// 获得像素点坐标
			getPoints();
			// 动画
			refreshPoints();
		};
		
		// 文件base64化，以便获知图片原始尺寸
		reader.onload = function(e) {
			img.src = e.target.result;
		};
		// 选择文件
		eleFile.addEventListener('change', function (event) {
			file = event.target.files[0];
			// 选择的文件是图片
			if (file.type.indexOf("image") == 0) {
				reader.readAsDataURL(file);
			}
		});
		
		// 如果是输入文字
		eleLetter.addEventListener('change', function () {
			if (this.value && this.value.length == 1) {
				context.fillStyle = 'white';
				context.textBaseline = 'middle';
				context.textAlign = 'center';
				context.font = 'bold 280px arial';
				// 清除画布
				context.clearRect(0, 0, width, height);
				// 绘制文本
				context.fillText(this.value, width/2, height/2);
				// 获得像素点坐标
				getPoints();
				// 动画
				refreshPoints();
			}
		});
		
		var getPoints = function () {
			// 间隙大小
			var gap = 13;
			var imgData = context.getImageData(0,0,width,height).data;
		
			var pos = [];
			var x = 0, y = 0, index = 0;
			for (var i=0; i<imgData.length; i+=(4*gap)) {
				if (imgData[i+3] == 255) {
					// 塞入此时的坐标
					pos.push({
						x: x,
						y: y
					});
				}
				index = Math.floor(i / 4);
				x = index % width;
				y = Math.floor(index / width);
				if (x >= width - gap) {
					i += gap * 4 * width;
				}
			}
		
			points = pos;
		};	
	})();
	
	/*
	 * t: current time（当前时间）；
	 * b: beginning value（初始值）；
	 * c: change in value（变化量）；
	 * d: duration（持续时间）。
	 * see: https://github.com/zhangxinxu/tween
	*/
	var Tween = {
		Expo: {
			easeIn: function(t, b, c, d) {
				return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
			},
			easeOut: function(t, b, c, d) {
				return (t==d) ? b + c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
			}
		}
	};

	// 动画效果主方法
	// 存储实例
	var store = {};
	var refreshPoints = function() {
		var canvas = document.querySelector('#plexus');
		var context = canvas.getContext('2d');
		// 画布尺寸
		var width = canvas.width;
		var height = canvas.height;
		
		// 是否继续不断重绘标志量
		var flag = true;
	
		// 实例方法
		var Dot = function (coord) {
			// 一开始新建实例的圆心坐标
			this.arcX = width / 2;
			this.arcY = height / 2;
			// 半径大小
			var r = 5.5;
			// 默认透明度
			this.opacity = 1;
			// 初始时间
			this.start = 0;
			// 绘制方法
			this.draw = function () {
				context.beginPath();
				context.arc(this.arcX, this.arcY, r, 0, 2 * Math.PI);
				// 填充绘制的圆
				context.fillStyle = 'rgba(59,166,241,'+ this.opacity +')';
				context.closePath();
				context.fill();
			};
		};
			
		// 绘制坐标移动与绘制
		var draw = function () {
			// 位置移动
			for (var index in store) {
				var dot = store[index];
		
				// 目标位置
				var startX = dot.startX;
				var startY = dot.startY;
				
				// 结束时间
				var end = 60;
	
				var distanceX = dot.distanceX;
				var distanceY = dot.distanceY;
	
				dot.start++;
	
				var arcX = Tween.Expo.easeOut(dot.start, startX, distanceX, end);
				var arcY = Tween.Expo.easeOut(dot.start, startY, distanceY, end);
				
				// 动画结束，停止继续绘制
				if (dot.start >= end) {
					dot.arcX = distanceX + startX;
					dot.arcY = distanceY + startY;
					flag = false;
				} else {
					dot.arcX = arcX;
					dot.arcY = arcY;
				}
				
				// 根据新圆心坐标绘制圆
				dot.draw();
			}
		};
		
		var init = function () {
			// 看看点实例够不够，因为不同图形的坐标点个数是不一样的
			var lengthExist = Object.keys(store).length;
			var lengthPoints = points.length;
			
			if (lengthExist > lengthPoints) {
				// 原来有些点要隐藏
				(function () {
					for (var index in store) {
						var dot = store[index];
						// 初始化动画时间
						dot.start = 0;
						if (index >= lengthPoints) {
							// 多余的实例看不见
							dot.opacity = 0;
						}
					}	
				})();
			}
			
			// 对即将参与动画的点进行数据初始化
			points.forEach(function (coord, index) {
				var dot = store[index];
				if (!dot) {
					dot = new Dot(coord);
					store[index] = dot;
				}
				dot.opacity = 1;
				// 给予dot目标位置
				dot.startX = dot.arcX;
				dot.startY = dot.arcY;
				// 确定好移动距离
				dot.distanceX = coord.x - dot.arcX;
				dot.distanceY = coord.y - dot.arcY;
				// 初始化动画时间
				dot.start = 0;
			});
		};
		// 初始化
		init();
		// 绘制画布上所有的圆圈圈
		// 画布渲染
		var render = function () {
			// 清除画布
			context.clearRect(0, 0, width, height);
				
			// 绘制画布上所有的圆圈圈
			draw();
	
			// 继续渲染
			if (flag == true) {
				requestAnimationFrame(render);
			}
		};
	
		render();
	};	
})();