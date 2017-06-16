
$("textarea").on({
  // 输入时高亮
  input: function(){
    var _this = $(this),
        editor = _this.parent()
    editor.addClass('modified').removeClass('done')
  },
  // 聚焦时记录原来的值
  focusin: function() {
    var _this = $(this),
        editor = _this.parent()
    // 记录当前值
    editor.addClass('focus')
    _this.data('origin', _this.val())
  },
  // ctrl+enter触发提交
  keydown: function(e) {
    if (e.ctrlKey && e.keyCode === 13) {
      var _this = $(this),
          editor = _this.parent()
      editor.removeClass('focus')
      $(this).trigger('commit', [$(this)])
    }
  },
  // 离焦也触发提交
  focusout: function() {
    var _this = $(this),
        editor = _this.parent()
    editor.removeClass('focus')
    $(this).trigger('commit', [$(this)])
  },
  // 提交数据
  commit: function(evt, _this) {
    var editor = _this.parent()
    originVal = _this.data('origin')
    // 如果没变，什么都不做
    if (!_this.val() || _this.val() === originVal) return editor.removeClass('modified')
    // 赋新的值
    _this.data('origin', _this.val())

    editor.addClass('pending')
    _this.attr('readonly', 'readonly')

    $.post(location.href, {
      lang: _this.data('lang'),
      key: _this.data('key'),
      old: originVal,
      value: _this.val()
      }
    )
    .done(function(res) {
      editor.removeClass('empty pending modified')
      if (res == 'ok') {
        editor.addClass('done')
      } else {
        editor.addClass('fail')
      }
      _this.removeAttr('readonly')
    })
  }
})
