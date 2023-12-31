// jQuery('#qrcodeCanvas').qrcode({
//   text: "http://jetienne.com/"
// });

Dropzone.autoDiscover = false;

function getExtention(fname) {
  return fname.slice((fname.lastIndexOf(".") - 1 >>> 0) + 2);
}

function pathJoin(parts, sep) {
  var separator = sep || '/';
  var replace = new RegExp(separator + '{1,}', 'g');
  return parts.join(separator).replace(replace, separator);
}

function getQueryString(name) {
  var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
  var r = decodeURI(window.location.search).substr(1).match(reg);
  if (r != null) return r[2].replace(/\+/g, ' ');
  return null;
}

function checkPathNameLegal(name) {
  var reg = new RegExp("[\\/:*<>|]");
  var r = name.match(reg)
  return r == null;
}

function showErrorMessage(jqXHR) {
  let errMsg = jqXHR.getResponseHeader("x-auth-authentication-message")
  if (errMsg == null) {
    errMsg = jqXHR.responseText
  }
  alert(String(jqXHR.status).concat(":", errMsg));
  console.error(errMsg)
}


Vue.use(Vuex);
// 创建一个简单的Vuex Store
const store = new Vuex.Store({
  state: {
    token: localStorage.getItem('token') || null
  },
  mutations: {
    setToken(state, token) {
      state.token = token;
      localStorage.setItem('token', token); // 在mutation中保存到LocalStorage
    },
    clearToken(state) {
      state.token = null;
      localStorage.removeItem('token'); // 清除LocalStorage中的Token
    }
  }
});

var vm = new Vue({
  el: "#app",
  store: store,
  data: {
    user: {
      email: "",
      name: "",
    },
    location: window.location,
    breadcrumb: [],
    showHidden: false,
    previewMode: false,
    preview: {
      filename: '',
      filetype: '',
      filesize: 0,
      contentHTML: '',
    },
    version: "loading",
    mtimeTypeFromNow: false, // or fromNow
    auth: {},
    modelsearch: '', // 搜索内容
    searchModelContent:[], // models检索结果
    searchDataSetContent: [], // dataset检索结果
    searchResultIndex: -1, // 当前搜索结果显示
    searchResultPath: '', // 当前选中的内容路径
    isFocused: false, // 搜索框是否聚焦
    typingTimer: null,
    typingTimeout: 1000,  // 设置停顿的时间阈值，单位为毫秒
    downloadrankArr: [], // 下载排行榜
    checkrankArr:[], // 搜索排行榜
    downorcheck: true, // 当前展示下载还是排行，true是下载，false是搜索
    search: getQueryString("search"),
    files: [{
      name: "loading ...",
      path: "",
      size: "...",
      type: "dir",
    }],
    downPath:'',
    showControl: false,
    myDropzone: null,
    showrank:false
  },
  computed: {
    token: function() {
      return this.$store.state.token;
    },
    searchContent:function(){
      return [...this.searchModelContent, ...this.searchDataSetContent]
    },
    shouldShowElement: function() {
      if(this.searchModelContent.length >0 || this.searchDataSetContent.length > 0) {
        return true
      } else {
        return false
      }
    },
    computedFiles: function () {
      console.log("computedFiles")
      var that = this;
      that.preview.filename = null;
      that.handleURLChange(0)

      var files = this.files.filter(function (f) {
        if (f.name == 'README.md') {
          that.preview.filename = f.name;
          that.handleURLChange(1)
        }
        if (!that.showHidden && f.name.slice(0, 1) === '.') {
          return false;
        }
        return true;
      });
      // console.log(this.previewFile)
      if (this.preview.filename) {
        var name = this.preview.filename; // For now only README.md
        console.log(pathJoin([location.pathname, 'README.md']))
        $.ajax({
          url: pathJoin([location.pathname, 'README.md']),
          method: 'GET',
          success: function (res) {
            var converter = new showdown.Converter({
              tables: true,
              omitExtraWLInCodeBlocks: true,
              parseImgDimensions: true,
              simplifiedAutoLink: true,
              literalMidWordUnderscores: true,
              tasklists: true,
              ghCodeBlocks: true,
              smoothLivePreview: true,
              simplifiedAutoLink: true,
              strikethrough: true,
            });

            var html = converter.makeHtml(res);
            that.preview.contentHTML = html;
          },
          error: function (err) {
            console.log(err)
          }
        })
      }
      // 发现第一个type为file的元素
      if(Array.isArray(files)) {
        let splitIndex = files.findIndex((item) => item.type == 'file')
        if(splitIndex !== -1) {
          let dirArray = files.slice(0, splitIndex);
          let fileArray = files.slice(splitIndex);

          dirArray.sort(function(a, b) {
            // 按照name属性进行降序排序
            return a.name.localeCompare(b.name);
          });
          fileArray.sort(function(a, b) {
            // 按照name属性进行降序排序
            return a.name.localeCompare(b.name);
          });
          files = dirArray.concat(fileArray)
        }
      }

      return files;
    },
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
  },
  created: function () {
    this.handleResize()
    window.addEventListener('resize', this.handleResize);
    // $.ajax({
    //   url: "/-/user",
    //   method: "get",
    //   dataType: "json",
    //   success: function (ret) {
    //     if (ret) {
    //       this.user.email = ret.email;
    //       this.user.name = ret.name;
    //     }
    //   }.bind(this)
    // })
    $.ajax({
      url: `https://${window.location.hostname}/?downloadrank=1`,
      // url: "http://localhost:8001/?downloadrank=1",
      method: "get",
      dataType: "json",
      success: function (ret) {
        if (ret) {
          this.downloadrankArr = ret.rank
        }
      }.bind(this)
    })
    $.ajax({
      url: `https://${window.location.hostname}/?checkrank=1`,
      // url: "http://localhost:8001/?checkrank=1",
      method: "get",
      dataType: "json",
      success: function (ret) {
        if (ret) {
          this.checkrankArr = ret.rank
        }
      }.bind(this)
    })
    this.myDropzone = new Dropzone("#upload-form", {
      paramName: "file",
      maxFilesize: 10240,
      addRemoveLinks: true,
      init: function () {
        this.on("uploadprogress", function (file, progress) {
          // console.log("File progress", progress);
        });
        this.on("complete", function (file) {
          console.log("reload file list")
          loadFileList()
        })
      }
    });
  },
  methods: {
    // addtoken() {
    //   let oldtoken = this.$store.state.token;
    //   console.log(this.$store, typeof oldtoken)
    //   this.$store.dispatch('setToken', oldtoken+1); // 设置Token
    // },
    handleResize(){
      // 当为手机尺寸的时候，我就把排行榜删掉
      const mobileWidthThreshold = 768;
      this.showrank =  window.innerWidth > mobileWidthThreshold;
    },
    // 处理器处理当前网址
    handleURLChange(tag) {
      if(tag == 0) {
        this.showControl = false
        this.downPath = '';
        return
      }
      let tempUrl = window.location.href
      if(tempUrl.includes('/models/')) {
        let arr = tempUrl.split('/models/')
        this.showControl = true
        this.downPath = `python model_download.py --mirror --repo_id ${arr[1]}`
      } else if(tempUrl.includes('/datasets/')) {
        let arr = tempUrl.split('/datasets/')
        this.showControl = true
        this.downPath = `python model_download.py --repo_type dataset --mirror --repo_id ${arr[1]}`
      } else {
        this.showControl = false
        this.downPath = '';
      }
    },
    // 下载排行榜跳转
    rankhref(member) {
      window.location.href = `https://${window.location.hostname}${member}`
    },

    // 搜索排行榜跳转
    rankhref1(member) {
      window.location.href = `https://${window.location.hostname}/${member}`
    },

    // 选择排行榜
    changeDownOrCheck() {
      this.downorcheck = !this.downorcheck
    },

    // 处理返回内容（下载排行榜）
    deleteModel(content) {
      if(content=='' || content ==' ') {
        return 'mode_download.py'
      }
      if(content.includes("/models/")) {
        return content.replace("/models/", '')
      }
      if(content.includes("/datasets/")) {
        return content.replace("/datasets/", '')
      }

      return content
    },
    // 处理返回内容（搜索排行榜）
    deleteModel1(content) {
      if(content.includes("models/")) {
        return content.replace("models/", '')
      }
      if(content.includes("datasets/")) {
        return content.replace("datasets/", '')
      }

      return content
    },

    // 处理输入框的上下按键
    handleKeyDown(event) {
      if(event.key === 'Enter') {
        event.preventDefault();
        let item = this.searchContent[this.searchResultIndex]
        window.location.href = `https://aliendao.cn/${item.path}`
        return
      }


      let range = this.searchContent.length
      if(range == 0) return
      let rel_range = range-1

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if(this.searchResultIndex - 1 >= 0) {
          this.searchResultIndex = this.searchResultIndex - 1
        } else {
          this.searchResultIndex = rel_range
        }
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if(this.searchResultIndex + 1 <= rel_range) {
          this.searchResultIndex = this.searchResultIndex + 1
        } else {
          this.searchResultIndex = 0
        }
      }

      if(this.searchResultIndex != -1) {
        let item = this.searchContent[this.searchResultIndex]
        this.searchResultPath = item.path
      }

    },
    // 点击跳转
    async clickToLick(item) {
      // 保存一下记录
      if(window.location.hostname == 'localhost') {
        // 测试环境
        await axios.get(`http://localhost:8001/?checkrember=${item.path}`)
      } else {
        await axios.get(`https://${window.location.hostname}/?checkrember=${item.path}`)
      }

      window.location.href = `https://${window.location.hostname}/${item.path}`
    },
    // 修改名称
    modifyName(item) {
      let tempName = item.path
      if(tempName.includes("models/")) {
        tempName = tempName.replace("models/","")
      }
      if(tempName.includes("datasets/")) {
        tempName = tempName.replace("datasets/","")
      }
      return tempName
    },
    // 搜索联想
    handleInput() {
      // 清除之前的计时器
      clearTimeout(this.typingTimer);

      let that = this
      // 启动一个新的计时器
      this.typingTimer = setTimeout(async () => {
        // 在用户停顿一段时间后执行的操作
        await that.getSearchResult()
        that.searchResultIndex = -1
        that.searchResultPath =''

        // 在这里可以添加你想要执行的逻辑
      }, this.typingTimeout);
    },
    // 输入框聚焦
    onInputFocus: function() {
      this.isFocused = true;
    },
    // 输入框失焦
    onInputBlur: function() {
      let that = this
      setTimeout(()=> {
        that.isFocused = false;
        that.searchResultIndex = -1
        that.searchResultPath =''
      },500)
    },
    // 请求搜索数据
    async getSearchResult() {
      let result = await axios.get(`https://${window.location.hostname}/?check=${this.modelsearch}`)
      let data = result.data
      if(Array.isArray(data.models)&& data.models.length >= 10) {
        this.searchModelContent = data.models.slice(0,10)
      } else {
        this.searchModelContent = data.models
      }

      if(Array.isArray(data.datasets)&& data.datasets.length >= 10) {
        this.searchDataSetContent = data.datasets.slice(0,10)
      } else {
        this.searchDataSetContent = data.datasets
      }
    },
    getEncodePath: function (filepath) {
      return pathJoin([location.pathname].concat(filepath.split("/").map(v => encodeURIComponent(v))))
    },
    formatBytes:function (value) {
      var bytes = parseFloat(value);
      if (bytes < 0) return "-";
      else if (bytes < 1024) return bytes + " B";
      else if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
      else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
      else return (bytes / 1073741824).toFixed(1) + " GB";
    },
    formatTime: function (timestamp) {
      var m = moment(timestamp);
      if (this.mtimeTypeFromNow) {
        return m.fromNow();
      }
      return m.format('YYYY-MM-DD HH:mm:ss');
    },
    toggleHidden: function () {
      this.showHidden = !this.showHidden;
    },
    removeAllUploads: function () {
      this.myDropzone.removeAllFiles();
    },
    parentDirectory: function (path) {
      return path.replace('\\', '/').split('/').slice(0, -1).join('/')
    },
    changeParentDirectory: function (path) {
      var parentDir = this.parentDirectory(path);
      loadFileOrDir(parentDir);
    },
    genInstallURL: function (name, noEncode) {
      var parts = [location.host];
      var pathname = decodeURI(location.pathname);
      if (!name) {
        parts.push(pathname);
      } else if (getExtention(name) == "ipa") {
        parts.push("/-/ipa/link", pathname, encodeURIComponent(name));
      } else {
        parts.push(pathname, name);
      }
      var urlPath = location.protocol + "//" + pathJoin(parts);
      return noEncode ? urlPath : encodeURI(urlPath);
    },
    genQrcode: function (name, title) {
      var urlPath = this.genInstallURL(name, true);
      $("#qrcode-title").html(title || name || location.pathname);
      $("#qrcode-link").attr("href", urlPath);
      $('#qrcodeCanvas').empty().qrcode({
        text: encodeURI(urlPath),
      });

      $("#qrcodeRight a").attr("href", urlPath);
      $("#qrcode-modal").modal("show");
    },
    genDownloadURL: function (f) {
      var search = location.search;
      var sep = search == "" ? "?" : "&"
      return location.origin + this.getEncodePath(f.name) + location.search + sep + "download=true";
    },
    genDownloadURL1: function (f) {
      return "http://61.133.217.142:20800/download" + this.getEncodePath(f.name)
    },
    shouldHaveQrcode: function (name) {
      return ['apk', 'ipa'].indexOf(getExtention(name)) !== -1;
    },
    genFileClass: function (f) {
      if (f.type == "dir") {
        if (f.name == '.git') {
          return 'fa-git-square';
        }
        return "fa-folder-open";
      }
      var ext = getExtention(f.name);
      switch (ext) {
        case "go":
        case "py":
        case "js":
        case "java":
        case "c":
        case "cpp":
        case "h":
          return "fa-file-code-o";
        case "pdf":
          return "fa-file-pdf-o";
        case "zip":
          return "fa-file-zip-o";
        case "mp3":
        case "wav":
          return "fa-file-audio-o";
        case "jpg":
        case "png":
        case "gif":
        case "jpeg":
        case "tiff":
          return "fa-file-picture-o";
        case "ipa":
        case "dmg":
          return "fa-apple";
        case "apk":
          return "fa-android";
        case "exe":
          return "fa-windows";
      }
      return "fa-file-text-o"
    },
    clickFileOrDir: function (f, e) {
      var reqPath = this.getEncodePath(f.name)
      // TODO: fix here tomorrow
      if (f.type == "file") {
        if(f.size > 1048576) {
          alert("请复制下载链接地址，新打开一个浏览器标签页，粘贴到地址栏中下载")
          return;
        } else {
          window.location.href = reqPath;
          return;
        }
      }
      loadFileOrDir(reqPath);
      e.preventDefault()
    },
    changePath: function (reqPath, e) {
      loadFileOrDir(reqPath);
      e.preventDefault()
    },
    showInfo: function (f) {
      console.log(f);
      $.ajax({
        url: this.getEncodePath(f.name),
        data: {
          op: "info",
        },
        method: "GET",
        success: function (res) {
          $("#file-info-title").text(f.name);
          $("#file-info-content").text(JSON.stringify(res, null, 4));
          $("#file-info-modal").modal("show");
          // console.log(JSON.stringify(res, null, 4));
        },
        error: function (jqXHR, textStatus, errorThrown) {
          showErrorMessage(jqXHR)
        }
      })
    },
    makeDirectory: function () {
      var name = window.prompt("current path: " + location.pathname + "\nplease enter the new directory name", "")
      console.log(name)
      if (!name) {
        return
      }
      if(!checkPathNameLegal(name)) {
        alert("Name should not contains any of \\/:*<>|")
        return
      }
      $.ajax({
        url: this.getEncodePath(name),
        method: "POST",
        success: function (res) {
          console.log(res)
          loadFileList()
        },
        error: function (jqXHR, textStatus, errorThrown) {
          showErrorMessage(jqXHR)
        }
      })
    },
    deletePathConfirm: function (f, e) {
      e.preventDefault();
      if (!e.altKey) { // skip confirm when alt pressed
        if (!window.confirm("Delete " + f.name + " ?")) {
          return;
        }
      }
      $.ajax({
        url: this.getEncodePath(f.name),
        method: 'DELETE',
        success: function (res) {
          loadFileList()
        },
        error: function (jqXHR, textStatus, errorThrown) {
          showErrorMessage(jqXHR)
        }
      });
    },
    updateBreadcrumb: function (pathname) {
      var pathname = decodeURI(pathname || location.pathname || "/");
      pathname = pathname.split('?')[0]
      var parts = pathname.split('/');
      this.breadcrumb = [];
      if (pathname == "/") {
        return this.breadcrumb;
      }
      var i = 2;
      for (; i <= parts.length; i += 1) {
        var name = parts[i - 1];
        if (!name) {
          continue;
        }
        var path = parts.slice(0, i).join('/');
        this.breadcrumb.push({
          name: name + (i == parts.length ? ' /' : ''),
          path: path
        })
      }
      return this.breadcrumb;
    },
    loadPreviewFile: function (filepath, e) {
      if (e) {
        e.preventDefault() // may be need a switch
      }
      var that = this;
      $.getJSON(pathJoin(['/-/info', location.pathname]))
          .then(function (res) {
            console.log(res);
            that.preview.filename = res.name;
            that.preview.filesize = res.size;
            return $.ajax({
              url: '/' + res.path,
              dataType: 'text',
            });
          })
          .then(function (res) {
            console.log(res)
            that.preview.contentHTML = '<pre>' + res + '</pre>';
            console.log("Finally")
          })
          .done(function (res) {
            console.log("done", res)
          });
    },
    loadAll: function () {
      // TODO: move loadFileList here
    },
  }
})

window.onpopstate = function (event) {
  if (location.search.match(/\?search=/)) {
    location.reload();
    return;
  }
  loadFileList()
}

function loadFileOrDir(reqPath) {
  let requestUri = reqPath + location.search
  var retObj = loadFileList(requestUri)
  if (retObj !== null) {
    retObj.done(function () {
      window.history.pushState({}, "", requestUri);
    });
  }

}

function loadFileList(pathname) {
  var pathname = pathname || location.pathname + location.search;
  var retObj = null
  if (getQueryString("raw") !== "false") { // not a file preview
    var sep = pathname.indexOf("?") === -1 ? "?" : "&"
    retObj = $.ajax({
      url: pathname + sep + "json=true",
      dataType: "json",
      cache: false,
      success: function (res) {
        res.files = _.sortBy(res.files, function (f) {
          var weight = f.type == 'dir' ? 1000 : 1;
          return -weight * f.mtime;
        })
        vm.files = res.files;
        vm.auth = res.auth;
        vm.updateBreadcrumb(pathname);
      },
      error: function (jqXHR, textStatus, errorThrown) {
        showErrorMessage(jqXHR)
      },
    });

  }

  vm.previewMode = getQueryString("raw") == "false";
  if (vm.previewMode) {
    vm.loadPreviewFile();
  }
  return retObj
}

Vue.filter('fromNow', function (value) {
  return moment(value).fromNow();
})

Vue.filter('formatBytes', function (value) {
  var bytes = parseFloat(value);
  if (bytes < 0) return "-";
  else if (bytes < 1024) return bytes + " B";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + " MB";
  else return (bytes / 1073741824).toFixed(1) + " GB";
})

$(function () {
  $.scrollUp({
    scrollText: '', // text are defined in css
  });

  // For page first loading
  loadFileList(location.pathname + location.search)

  // update version
  $.getJSON("/-/sysinfo", function (res) {
    vm.version = res.version;
  })

  var clipboard = new Clipboard('.btn');
  clipboard.on('success', function (e) {
    // 点一次复制下载链接就记录一下下载
    if(e.action == 'copy') {
      let temArr = e.text.split("/download")
      let nextEle = temArr[1]
      let index = nextEle.lastIndexOf("/")
      let tempPath = nextEle.slice(0,index)
      console.log(tempPath)
      axios.get(`https://${window.location.hostname}/?downloadrember=${tempPath}`)
    }

    // console.info('Action:', e.action);
    // console.info('Text:', e.text);
    // console.info('Trigger:', e.trigger);
    $(e.trigger)
        .tooltip('show')
        .mouseleave(function () {
          $(this).tooltip('hide');
        })

    e.clearSelection();
  });
});
