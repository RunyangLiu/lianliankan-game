# 果趣对对消微信小游戏版

用微信开发者工具导入本文件夹：`wechat-miniprogram`。

上线前需要在微信公众平台后台配置 request 合法域名：

```text
https://elvhilpbpndlwoeusyxt.supabase.co
```

导入时使用 AppID：

```text
wx48a576f011962ebf
```

## 上传前加固检查

1. 微信开发者工具导入 `wechat-miniprogram` 文件夹。
2. 点击右上角 `详情`，确认 `上传代码时样式自动补全`、`压缩代码` 保持开启。
3. 确认项目配置里不上传 SourceMap，当前已设置为 `uploadWithSourceMap: false`。
4. 按微信后台通知要求，在通知里的《游戏深度保护插件》入口完成接入或授权。
5. 完成后重新点击开发者工具右上角 `上传`，再到微信公众平台 `管理 -> 版本管理 -> 开发版本 -> 提交审核`。
