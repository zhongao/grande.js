(function() {
  var EDGE = -999;  // 工具条位置参数

  var root = this,   // window
      document = this.document, // 安全复制一份document对象到内存以便使用

      // 可编辑的节点
      editableNodes = document.querySelectorAll(".g-body article"),

      // TODO 为后续图片上传准备的
      editNode = editableNodes[0], // TODO: cross el support for imageUpload

      // 判断火狐浏览器
      isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1,

      // 控制器 配置
      options = {
        animate: true // 激活？
      },
      // 工具条节点 .text-menu
      textMenu,

      // 操作节点 .text-menu .options
      optionsNode,

      // 链接输入框 .text-menu .url-input
      urlInput,

      // ？
      previouslySelectedText,

      // 图片工具
      imageTooltip,
      imageInput,
      imageBound;

      // 核心对象
      grande = {
        bind: function(bindableNodes, opts) {
          // 如果传入了绑定区域参数，则设置，否则默认
          if (bindableNodes) {
            editableNodes = bindableNodes;
          }

          attachToolbarTemplate(); // 添加工具栏模板
          bindTextSelectionEvents(); // 绑定 文本选择 事件
          bindTextStylingEvents(); // 绑定 文本样式设置 事件

          // 如果传入了控制器配置参数，则设置，否则默认
          options = opts || options;
        },
        select: function() {
          // 触发文本选择器？
          triggerTextSelection();
        }
      },

      // 标签样式映射？
      tagClassMap = {
        "b": "bold",
        "i": "italic",
        "h1": "header1",
        "h2": "header2",
        "a": "url",
        "blockquote": "quote"
      };

  // 添加文本操作工具栏模板
  function attachToolbarTemplate() {
    var div = document.createElement("div"), // 创建DIV
        // 工具栏HTML模板
        toolbarTemplate = "<div class='options'> \
          <span class='no-overflow'> \
            <span class='ui-inputs'> \
              <button class='bold'>B</button> \
              <button class='italic'>i</button> \
              <button class='header1'>h1</button> \
              <button class='header2'>h2</button> \
              <button class='quote'>&rdquo;</button> \
              <button class='url useicons'>&#xe001;</button> \
              <input class='url-input' type='text' placeholder='Paste or type a link'/> \
            </span> \
          </span> \
        </div>",
        // 创建"图片上传"工具栏DIV
        imageTooltipTemplate = document.createElement("div");

    // 图片上传 工具栏DIV里面的HTML
    imageTooltipTemplate.innerHTML = "<div class='pos-abs file-label'>插入图片</div> \
                                        <input class='file-hidden pos-abs' type='file' id='files' name='files[]' accept='image/*' multiple/>";
    // 图片上传 工具栏DIV 样式， 默认hide
    imageTooltipTemplate.className = "image-tooltip hide";

    // 工具栏DIV样式和内部HTML
    div.className = "text-menu hide";
    div.innerHTML = toolbarTemplate;

    // 将文本操作工具栏插入</body>之前
    if (document.querySelectorAll(".text-menu").length === 0) {
      document.body.appendChild(div);
      document.body.appendChild(imageTooltipTemplate);
    }

    // 获取相关节点为变量，以便其它函数使用
    imageInput = document.querySelectorAll(".file-label + input")[0];
    imageTooltip = document.querySelectorAll(".image-tooltip")[0];
    textMenu = document.querySelectorAll(".text-menu")[0];
    optionsNode = document.querySelectorAll(".text-menu .options")[0];
    urlInput = document.querySelectorAll(".text-menu .url-input")[0];
  }


  // 绑定 文本选择及编辑的事件 有许多事件
  function bindTextSelectionEvents() {
    var i,
        len,
        node;

    // Trigger on both mousedown and mouseup so that the click on the menu
    // feels more instantaneously active
    
    // onmousedown 事件会在鼠标按键被按下时发生
    // 在这里，将当前文档的鼠标按下事件的响应函数设置为triggerTextSelection函数
    // 
    // 即：只要有鼠标按下，就会执行该函数
    document.onmousedown = triggerTextSelection;

    // onmouseup 事件会在鼠标按键被松开时发生
    document.onmouseup = function(event) {
      setTimeout(function() {
        triggerTextSelection(event); // 异步执行该函数
      }, 1);
    };

    // onkeydown 事件会在用户按下一个键盘按键时发生
    // 无论按下键盘上的哪个键，都将呼叫preprocessKeyDown()函数
    // 在这里，在HR后创建一个P，然后阻止回车动作。
    document.onkeydown = preprocessKeyDown;

    // onkeyup 事件会在键盘按键被松开时发生
    document.onkeyup = function(event){
      var sel = window.getSelection();

      // FF will return sel.anchorNode to be the parentNode when the triggered keyCode is 13
      // 如果sel的起始节点为真
      // 并且sel的起始节点名称 不等于 ARTICLE
      if (sel.anchorNode && sel.anchorNode.nodeName !== "ARTICLE") {

        // 解析键盘按键松开事件。
        triggerNodeAnalysis(event);

        // sel.isCollapsed为真，代表sel的起点和结束点位置相同，没有选择任何文本
        if (sel.isCollapsed) {
          triggerTextParse(event);
        }
      }
    };

    // Handle window resize events
    // onresize 事件会在窗口或框架被调整大小时发生
    // 当调整窗口或框架大小时，也触发该函数，以重新定位工具条位置
    root.onresize = triggerTextSelection;

    // onblur 事件会在对象失去焦点时发生
    urlInput.onblur = triggerUrlBlur;
    // onkeydown 事件会在用户按下一个键盘按键时发生
    urlInput.onkeydown = triggerUrlSet;

    // 如果控制器配置参数设置了允许图片上传
    if (options.allowImages) {
      // 点击触发图片上传
      imageTooltip.onmousedown = triggerImageUpload;

      // onchange 事件会在域的内容改变时发生
      imageInput.onchange = uploadImage;

      // onmousemove 事件会在鼠标指针移动时发生
      document.onmousemove = triggerOverlayStyling;
    }

    // editableNodes是绑定的编辑区域的节点，这里需要为数组，否则就没有.length了
    for (i = 0, len = editableNodes.length; i < len; i++) {
      node = editableNodes[i];
      // HTML5 全局属性，contenteditable 属性规定是否可编辑元素的内容
      node.contentEditable = true;
      // 在可编辑区域内，无论是鼠标点击、键盘按键松开，鼠标按键松开，
      // 这些事件，都被绑定到 triggerTextSelection 
      node.onmousedown = node.onkeyup = node.onmouseup = triggerTextSelection;
    }
  }


  function triggerOverlayStyling(event) {
    toggleImageTooltip(event, event.target);
  }

  // 触发图片上传事件
  function triggerImageUpload(event) {
    // Cache the bound that was originally clicked on before the image upload
    var childrenNodes = editNode.children,
        editBounds = editNode.getBoundingClientRect();

      imageBound = getHorizontalBounds(childrenNodes, editBounds);
  }

  // 图片上传函数
  function uploadImage(event) {
    // Only allow uploading of 1 image for now, this is the first file
    var file = this.files[0],
        reader = new FileReader(),
        figEl;

    reader.onload = (function(f) {
      return function(e) {
        figEl = document.createElement("figure");
        figEl.innerHTML = "<img src=\"" + e.target.result + "\"/>";
        editNode.insertBefore(figEl, imageBound.bottomElement);
      };
    }(file));

    reader.readAsDataURL(file);
  }

  function toggleImageTooltip(event, element) {
    var childrenNodes = editNode.children,
        editBounds = editNode.getBoundingClientRect(),
        bound = getHorizontalBounds(childrenNodes, editBounds);

    if (bound) {
      imageTooltip.style.left = (editBounds.left - 90 ) + "px";
      imageTooltip.style.top = (bound.top - 17) + "px";
    } else {
      imageTooltip.style.left = EDGE + "px";
      imageTooltip.style.top = EDGE + "px";
    }
  }

  function getHorizontalBounds(nodes, target) {
    var bounds = [],
        bound,
        i,
        len,
        preNode,
        postNode,
        bottomBound,
        topBound,
        coordY;

    // Compute top and bottom bounds for each child element
    for (i = 0, len = nodes.length - 1; i < len; i++) {
      preNode = nodes[i];
      postNode = nodes[i+1] || null;

      bottomBound = preNode.getBoundingClientRect().bottom - 5;
      topBound = postNode.getBoundingClientRect().top;

      bounds.push({
        top: topBound,
        bottom: bottomBound,
        topElement: preNode,
        bottomElement: postNode,
        index: i+1
      });
    }

    coordY = event.pageY - root.scrollY;

    // Find if there is a range to insert the image tooltip between two elements
    for (i = 0, len = bounds.length; i < len; i++) {
      bound = bounds[i];
      if (coordY < bound.top && coordY > bound.bottom) {
        return bound;
      }
    }

    return null;
  }

  /**
   * 将工具条每一个按钮节点传入回调函数执行
   * @param  {Function} callback 回调函数
   * @return {undefined}          
   */
  function iterateTextMenuButtons(callback) {
    var textMenuButtons = document.querySelectorAll(".text-menu button"),
        i,
        len,
        node;

    for (i = 0, len = textMenuButtons.length; i < len; i++) {
      node = textMenuButtons[i];

      (function(n) {
        callback(n);
      })(node);
    }
  }

  /**
   * 绑定工具按钮点击事件
   * @return {undefined} 
   */
  function bindTextStylingEvents() {
    iterateTextMenuButtons(function(node) {
      node.onmousedown = function(event) {
        triggerTextStyling(node); // 这里传入的node为工具条按钮节点button
      };
    });
  }

  // 返回包含“结束点”的节点
  function getFocusNode() {
    // sel.focusNode ：Returns the node in which the selection ends.
    // 返回包含“结束点”的节点
    return root.getSelection().focusNode;
  }

  function reloadMenuState() {
    var className,
        focusNode = getFocusNode(),
        tagClass,
        reTag;

    iterateTextMenuButtons(function(node) {
      className = node.className;

      for (var tag in tagClassMap) {
        tagClass = tagClassMap[tag];
        reTag = new RegExp(tagClass);

        if (reTag.test(className)) {
          if (hasParentWithTag(focusNode, tag)) {
            node.className = tagClass + " active";
          } else {
            node.className = tagClass;
          }

          break;
        }
      }
    });
  }

  /**
   * 预处理回车事件的函数
   * @param  {事件} event 浏览器定义的用户动作事件
   * @return {混合}       如果条件成立，阻止回车事件的默认动作
   */
  function preprocessKeyDown(event) {
    var sel = window.getSelection(),
        // 根据当前sel的起点寻找上级p节点
        parentParagraph = getParentWithTag(sel.anchorNode, "p"),
        p,
        isHr;

    // 如果按下回车键，并且存在上级p节点
    if (event.keyCode === 13 && parentParagraph) {
      // previousSlibling
      // 返回当前节点在其父节点的childNodes列表中的前一个节点,
      // 如果当前节点就是其父节点的第一个子节点,则返回null
      // 但chrome和firefox得到的是一个空白符文本节点？
      prevSibling = parentParagraph.previousSibling;

      // 上一个兄弟节点为真，并且节点名称为HR，并且上级P节点长度为0
      isHr = prevSibling && prevSibling.nodeName === "HR" &&
        !parentParagraph.textContent.length;

      // Stop enters from creating another <p> after a <hr> on enter
      // 阻止回车动作
      if (isHr) {
        event.preventDefault();
      }
    }
  }


  function triggerNodeAnalysis(event) {
    var sel = window.getSelection(),
        anchorNode,
        parentParagraph;

    // 回车键
    if (event.keyCode === 13) {

      // Enters should replace it's parent <div> with a <p>
      // 回车时应该当浏览器默认的<div>重设为<p>
      if (sel.anchorNode.nodeName === "DIV") {
        toggleFormatBlock("p"); //格式化div为P
      }

      parentParagraph = getParentWithTag(sel.anchorNode, "p");

      // 如果sel起始节点已经有P了，则再回车，就是添加HR了。
      if (parentParagraph) {
        insertHorizontalRule(parentParagraph);
      }
    }
  }

  // 插入HR的函数
  function insertHorizontalRule(parentParagraph) {
    var prevSibling,
        prevPrevSibling,
        hr;

    prevSibling = parentParagraph.previousSibling;
    prevPrevSibling = prevSibling;

    while(prevPrevSibling = prevPrevSibling.previousSibling) {
      if (prevPrevSibling.nodeType != Node.TEXT_NODE) {
        break;
      }
    }

    if (prevSibling.nodeName === "P" && !prevSibling.textContent.length && prevPrevSibling.nodeName !== "HR") {
      hr = document.createElement("hr");
      hr.contentEditable = false;
      parentParagraph.parentNode.replaceChild(hr, prevSibling);
    }
  }

  function getTextProp(el) {
    var textProp;

    if (el.nodeType === Node.TEXT_NODE) {
      textProp = "data";
    } else if (isFirefox) {
      textProp = "textContent";
    } else {
      textProp = "innerText";
    }

    return textProp;
  }

  function insertListOnSelection(sel, textProp, listType) {
    var execListCommand = listType === "ol" ? "insertOrderedList" : "insertUnorderedList",
        nodeOffset = listType === "ol" ? 3 : 2;

    document.execCommand(execListCommand);
    sel.anchorNode[textProp] = sel.anchorNode[textProp].substring(nodeOffset);

    return getParentWithTag(sel.anchorNode, listType);
  }

  function triggerTextParse(event) {
    var sel = window.getSelection(),
        textProp,
        subject,
        insertedNode,
        unwrap,
        node,
        parent,
        range;

    // FF will return sel.anchorNode to be the parentNode when the triggered keyCode is 13
    if (!sel.isCollapsed || !sel.anchorNode || sel.anchorNode.nodeName === "ARTICLE") {
      return;
    }

    textProp = getTextProp(sel.anchorNode);
    subject = sel.anchorNode[textProp];

    if (subject.match(/^-\s/) && sel.anchorNode.parentNode.nodeName !== "LI") {
      insertedNode = insertListOnSelection(sel, textProp, "ul");
    }

    if (subject.match(/^1\.\s/) && sel.anchorNode.parentNode.nodeName !== "LI") {
      insertedNode = insertListOnSelection(sel, textProp, "ol");
    }

    unwrap = insertedNode &&
            ["ul", "ol"].indexOf(insertedNode.nodeName.toLocaleLowerCase()) >= 0 &&
            ["p", "div"].indexOf(insertedNode.parentNode.nodeName.toLocaleLowerCase()) >= 0;

    if (unwrap) {
      node = sel.anchorNode;
      parent = insertedNode.parentNode;
      parent.parentNode.insertBefore(insertedNode, parent);
      parent.parentNode.removeChild(parent);
      moveCursorToBeginningOfSelection(sel, node);
    }
  }

  function moveCursorToBeginningOfSelection(selection, node) {
    range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 0);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function triggerTextStyling(node) {
    var className = node.className, // 按钮节点的className
        sel = window.getSelection(),
        selNode = sel.anchorNode, // 所选文本的起始节点
        tagClass,
        reTag;

    for (var tag in tagClassMap) {
      tagClass = tagClassMap[tag];
      reTag = new RegExp(tagClass);

      if (reTag.test(className)) {
        switch(tag) {
          case "b":
            if (selNode && !hasParentWithTag(selNode, "h1") && !hasParentWithTag(selNode, "h2")) {
              document.execCommand(tagClass, false);
            }
            return;
          case "i":
            document.execCommand(tagClass, false);
            return;

          case "h1":
          case "h2":
          case "h3":
          case "blockquote":
            toggleFormatBlock(tag);
            return;

          case "a":
            toggleUrlInput();
            optionsNode.className = "options url-mode";
            return;
        }
      }
    }

    triggerTextSelection();
  }

  function triggerUrlBlur(event) {
    var url = urlInput.value;

    optionsNode.className = "options";
    window.getSelection().addRange(previouslySelectedText);

    document.execCommand("unlink", false);

    if (url === "") {
      return false;
    }

    if (!url.match("^(http://|https://|mailto:)")) {
      url = "http://" + url;
    }

    document.execCommand("createLink", false, url);

    urlInput.value = "";
  }

  function triggerUrlSet(event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      event.stopPropagation();

      urlInput.blur();
    }
  }

  // 格式化标签，这函数难懂？？？
  function toggleFormatBlock(tag) {
    // 如果当前sel的结束节点，存在传入参数的上级节点
    if (hasParentWithTag(getFocusNode(), tag)) {

      // execCommand方法是执行一个对当前文档，当前选择或者给出范围的命令。
      // FormatBlock 设置当前块格式化标签
      document.execCommand("formatBlock", false, "p");
      // Outdent 减少选中区所在格式化块的缩进
      document.execCommand("outdent");
    } else {
      document.execCommand("formatBlock", false, tag);
    }
  }

  function toggleUrlInput() {
    setTimeout(function() {
      var url = getParentHref(getFocusNode());

      if (typeof url !== "undefined") {
        urlInput.value = url;
      } else {
        document.execCommand("createLink", false, "/");
      }

      previouslySelectedText = window.getSelection().getRangeAt(0);

      urlInput.focus();
    }, 150);
  }

  /**
   * 根据条件寻找上级节点
   * @param  {节点} node           当前节点
   * @param  {布尔} condition      条件
   * @param  {函数} returnCallback 回调函数
   * @return {混合} 
   *         如果找到符合条件的父节点，
   *         则将该节点传入回调函数执行，否则返回undefined
   */
  function getParent(node, condition, returnCallback) {
    // parentNode 属性可返回某节点的父节点
    while (node.parentNode) {
      // 如果条件为真，执行回调函数
      if (condition(node)) {
        return returnCallback(node);
      }

      // 否则继续往上寻找父节点，直到找到符合条件的节点
      node = node.parentNode;
      }
  }

  /**
   * 根据特定标签寻找上级节点
   * @param  {节点} node     当前节点
   * @param  {字符串} nodeType 需要寻找的标签
   * @return {混合}          找到则返回上级节点，没有找到及返回undefined
   */
  function getParentWithTag(node, nodeType) {
        // 检查传入的节点和节点类型
    var checkNodeType = function(node) { return node.nodeName.toLowerCase() === nodeType; },
        returnNode = function(node) { return node; };

      return getParent(node, checkNodeType, returnNode);
  }

  /**
   * 判断节点是否有特定标签的上级节点
   * @param  {节点}  node     当前节点
   * @param  {字符串}  nodeType 标签
   * @return {Boolean}          有则为真，否则为假
   */
  function hasParentWithTag(node, nodeType) {
    return !!getParentWithTag(node, nodeType);
  }

  /**
   * 寻找上级带有href属性的节点
   * @param  {节点} node 当前节点
   * @return {混合}      找到，则返回上级节点，没找到则返回undefined
   */
  function getParentHref(node) {
    var checkHref = function(node) { return typeof node.href !== "undefined"; },
        returnHref = function(node) { return node.href; };

    return getParent(node, checkHref, returnHref);
  }

  // 根据selection来设置工具条
  // 如果有选择文本，则定位工具条到该文本之上
  // 如果没有选择的文本，则不显示工具条
  function triggerTextSelection() {
      var selectedText = root.getSelection(), // Selection对象
          range, // range对象
          clientRectBounds;

      // The selected text is collapsed, push the menu out of the way
      // sel.isCollapsed 判断起点与结束点位置是否相同
      // 如果相同，则返回真，说明没有选择内容
      if (selectedText.isCollapsed) {
        // 如果所选文本无内容，则设置工具条位置-999, -999
        setTextMenuPosition(EDGE, EDGE);
        // 并设置工具条css如下
        textMenu.className = "text-menu hide";
      } else {
        range = selectedText.getRangeAt(0);
        // getBoundingClientRect() 获取range的位置
        clientRectBounds = range.getBoundingClientRect();

        // Every time we show the menu, reload the state
        reloadMenuState();

        // 跟据所选文本的位置，来设置工具条的位置
        setTextMenuPosition(
          clientRectBounds.top - 5 + root.pageYOffset,
          (clientRectBounds.left + clientRectBounds.right) / 2
        );
      }
  }

  // 设置工具条位置
  function setTextMenuPosition(top, left) {
    textMenu.style.top = top + "px";
    textMenu.style.left = left + "px";

    // 设置工具条是否显示出来
    if (options.animate) {
      if (top === EDGE) {
        textMenu.className = "text-menu hide";
      } else {
        textMenu.className = "text-menu active";
      }
    }
  }

  root.grande = grande;

}).call(this);
