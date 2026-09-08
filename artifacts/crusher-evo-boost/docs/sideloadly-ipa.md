# Sideloadly用IPA

このビルドはExpo Goではなく、`react-native-audio-api`を組み込んだ独立アプリです。
Sideloadlyが無料Apple Accountで再署名できるよう、初回版ではAudio Unit拡張と
App Group権限を除外しています。アプリ内の低音テストとEQ保存は含まれます。

## IPAを作成する

iOSアプリのコンパイルにはXcodeが必要です。ReplitのLinux環境やWindowsだけでは
IPAを生成できません。Mac、または後述のGitHub ActionsのmacOSランナーを使用します。

### Macで作成

必要なもの:

- XcodeとCommand Line Tools
- Node.jsとpnpm
- CocoaPods

リポジトリのルートで依存関係をインストールした後、次を実行します。

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/crusher-evo-boost run ipa:sideload
```

完成品:

```text
artifacts/crusher-evo-boost/build/sideload/Crusher-EVO-Boost-Sideloadly.ipa
```

スクリプトは、ネイティブiOSプロジェクト生成、CocoaPods、未署名Releaseビルド、
IPA梱包を順に実行します。途中で失敗した場合はIPAを完成品として扱いません。

### GitHub Actionsで作成

リポジトリをGitHubへ置き、Actions画面から **Build Crusher EVO Sideloadly IPA**
を実行します。完了後、実行結果のArtifactsから
`Crusher-EVO-Boost-Sideloadly`をダウンロードします。Appleの証明書やパスワードを
GitHubへ登録する必要はありません。

## SideloadlyでiPhoneへ入れる

1. WindowsまたはMacへSideloadlyを公式サイトからインストールします。
2. iPhoneをUSB接続し、端末側でコンピュータを信頼します。
3. 生成したIPAをSideloadlyへドラッグします。
4. 自分のApple Accountを入力して開始します。要求された場合はApple側で
   App用パスワードを作成します。認証情報はこのプロジェクトやReplitへ入力しません。
5. iPhoneで「設定」→「一般」→「VPNとデバイス管理」を開き、自分の開発者プロファイルを
   信頼します。iOSが求める場合は「プライバシーとセキュリティ」からデベロッパモードも
   有効にして再起動します。
6. Crusher EVOをBluetooth接続し、アプリを起動して低音テストを再生します。

無料Apple Accountの署名は通常7日で失効するため、期限前または失効後に同じ手順で
IPAを再インストールします。無料枠には同時に有効化できるアプリ数やApp ID数の制限も
あります。

## このIPAに含まれないもの

- Audio Unit（AUv3）拡張
- Apple MusicやYouTubeなど、他アプリの音声へ常時EQをかける機能
- App StoreまたはTestFlight配布用の署名

Audio Unit版は別のBundle ID、App Group、対応するプロビジョニングが必要なので、
有料Apple Developer Program向けの標準ビルドに残しています。