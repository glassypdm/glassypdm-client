# Changelog

## [0.7.1](https://github.com/glassypdm/glassypdm-client/compare/v0.7.0...v0.7.1) (2024-12-08)


### Bug Fixes

* break long filepaths in project update page's table ([ef174b8](https://github.com/glassypdm/glassypdm-client/commit/ef174b8609be016904a9cf39577249643b2e5366))
* file conflict detection is fixed ([029d111](https://github.com/glassypdm/glassypdm-client/commit/029d11113ff578e0bfb76bca5a22b01b8ab01d95))
* on download/reset, delete folders whose children have all been deleted ([95980c2](https://github.com/glassypdm/glassypdm-client/commit/95980c218d3cefad7108c6ee39ea867e42508201))
* verify files before uploading ([49acf5e](https://github.com/glassypdm/glassypdm-client/commit/49acf5eeda6bfebff62160216e48f635e46a14ba))


### Miscellaneous

* Add allocator for tracking memory usage ([568eaf6](https://github.com/glassypdm/glassypdm-client/commit/568eaf63b3935fddd5e607dfd4415e6b0234a4a7))
* Add indication a loaded page is re-fetching data ([eed2bd0](https://github.com/glassypdm/glassypdm-client/commit/eed2bd02eae73f445c9dd44937b42da2ba984e09))
* permission group membership list is more compact ([b6fa373](https://github.com/glassypdm/glassypdm-client/commit/b6fa3731780ddde9a8c57f2b42f9a7aaaded22e6))
* show file sizes to hundredths place when applicable ([8a45e27](https://github.com/glassypdm/glassypdm-client/commit/8a45e27881d09dba5581a79f18fddec225cda65f))

## [0.7.0](https://github.com/glassypdm/glassypdm-client/compare/v0.6.3...v0.7.0) (2024-10-29)


### Features

* Added page to view project update information ([75194b1](https://github.com/glassypdm/glassypdm-client/commit/75194b1c963b8a05a60fe1d0fa7e4c1b971bada5))
* project history pagination - view older project updates ([54b35fe](https://github.com/glassypdm/glassypdm-client/commit/54b35fe47397f37394a2f540dc9f501b7e54ea76))


### Bug Fixes

* the client will correctly say resetting files when the user is resetting files ([198a17a](https://github.com/glassypdm/glassypdm-client/commit/198a17a9da715dd6a8e80812006514bb62cec225))


### Miscellaneous

* added settings for disabling/enabling the cache ([cdf9c00](https://github.com/glassypdm/glassypdm-client/commit/cdf9c0054d038564822436b757df8a24269e6ce4))
* Added settings option to clear the cache ([a22d940](https://github.com/glassypdm/glassypdm-client/commit/a22d94041a891e4057153fe5fc56ae9400f0108f))
* disable upload/download buttons when syncing changes ([43f9a41](https://github.com/glassypdm/glassypdm-client/commit/43f9a417fb6365eeb0ed76e4122c46a880203817))
* improved project history loading UX ([918a71d](https://github.com/glassypdm/glassypdm-client/commit/918a71da11bfcef71a20c632a957dddb46b1b34b))
* redesigned settings page, added account settings ([c04e7ef](https://github.com/glassypdm/glassypdm-client/commit/c04e7ef37c1747fb4b39b6586f089ea8d825c546))

## [0.6.3](https://github.com/glassypdm/glassypdm-client/compare/v0.6.2...v0.6.3) (2024-10-17)


### Bug Fixes

* changing the server folder will properly clear the file table ([9ed4ad0](https://github.com/glassypdm/glassypdm-client/commit/9ed4ad0a02fc93fd0765c7369327d24428594a19))


### Miscellaneous

* add os 'agnostic' way to open directories ([d8120d1](https://github.com/glassypdm/glassypdm-client/commit/d8120d16df013dfba307d8fd6da5669c3da349a9))

## [0.6.2](https://github.com/glassypdm/glassypdm-client/compare/v0.6.1...v0.6.2) (2024-10-06)


### Bug Fixes

* Fixed bug where tracked deletions weren't occuring and where tracked changed files were shown as new files ([1ced1a5](https://github.com/glassypdm/glassypdm-client/commit/1ced1a504beebc78ad1ce7d1ed7fe17f60e96b15))


### Miscellaneous

* add timeout when server URL is incorrect or fetch fails ([f299fa1](https://github.com/glassypdm/glassypdm-client/commit/f299fa1052710307dac9bb8f1d211b7d39ecf3e6))
* improved error handling for server URL input ([4da4a97](https://github.com/glassypdm/glassypdm-client/commit/4da4a9783c872ff18012fceab24d8de71b5cd4cc))
* redesign permission groups page to have a smaller impact on network requests and better UX ([3227f33](https://github.com/glassypdm/glassypdm-client/commit/3227f335b2fc20b38ea72da5a7c36753aa14f460))

## [0.6.1](https://github.com/glassypdm/glassypdm-client/compare/v0.6.0...v0.6.1) (2024-09-28)


### Bug Fixes

* permission group select elements won't overflow ([8529d80](https://github.com/glassypdm/glassypdm-client/commit/8529d8010241b82b055ac3823a6776ee4ee14e30))
* properly classifying tracked deleted files ([ea6ec67](https://github.com/glassypdm/glassypdm-client/commit/ea6ec6793c7e08f7a97ca36d129958be90b1103b))
* team membership table does not overflow in y axis ([5dc3aff](https://github.com/glassypdm/glassypdm-client/commit/5dc3aff73d1c315c514837b9edf27dab6312cb1e))


### Miscellaneous

* adjusted file table UI ([ce6998f](https://github.com/glassypdm/glassypdm-client/commit/ce6998fda99fe7fd33ac74be176e7f1380c34707))
* increase commit file limit to 200 from 150 ([fe455f9](https://github.com/glassypdm/glassypdm-client/commit/fe455f961ac303df6c1363d033df371ab95b1876))

## [0.6.0](https://github.com/glassypdm/glassypdm-client/compare/v0.5.1...v0.6.0) (2024-09-09)


### Features

* add report bug link in about dialog ([e406ea5](https://github.com/glassypdm/glassypdm-client/commit/e406ea5ca48972296a236c581c2aaed3f7cfecdb))
* auto updater ([cb22f89](https://github.com/glassypdm/glassypdm-client/commit/cb22f89b17884a5a63503475010494dd1ec15fd6))
* can create and manage permission groups ([9033189](https://github.com/glassypdm/glassypdm-client/commit/9033189894975ac58a581497dc2fc29405bdc4d8))
* Can create projects from the client ([5931961](https://github.com/glassypdm/glassypdm-client/commit/593196189f8df8af77248e5413308cfdbf162ff2))
* concurrent uploads ([5d5be5c](https://github.com/glassypdm/glassypdm-client/commit/5d5be5c8347910cef03983db507a3be55e91f6fb))
* forgot password auth flow ([d2ee6b2](https://github.com/glassypdm/glassypdm-client/commit/d2ee6b2c75033dbbb8de682b5928aa338b53d64d))
* light mode option ([a8b499b](https://github.com/glassypdm/glassypdm-client/commit/a8b499b9b9285d8a8c721170adf68c88f51ebdf1))
* load projects ([f5178a4](https://github.com/glassypdm/glassypdm-client/commit/f5178a408a7625f9da7642ea76b4b84f6e77a072))
* new home page ([32dfcb5](https://github.com/glassypdm/glassypdm-client/commit/32dfcb5e38ad6179f6126f169bae3d0fadde8985))
* redesign team permission dashboard ([bcdcf8c](https://github.com/glassypdm/glassypdm-client/commit/bcdcf8c6c0b50128abd33fbf2f90129ee2dd861d))
* Replace default tauri icon ([f1f6d31](https://github.com/glassypdm/glassypdm-client/commit/f1f6d31a56c325e1ddd8fd4321d7bba46d5cc810))
* support chunked uploads ([1687540](https://github.com/glassypdm/glassypdm-client/commit/1687540d0ba5cd1ef1a649dc1505e6fb2e840f41))
* switch for swapping between dev/prod servers ([276b908](https://github.com/glassypdm/glassypdm-client/commit/276b908c36ed7e9190d5dc39cf40871f3d8c0ec4))
* team selection/creation page ([a252207](https://github.com/glassypdm/glassypdm-client/commit/a2522072fbcfd7af741bc69002a032e994bbf4f7))


### Miscellaneous

* Improved error handling for managing teams ([1ab33a2](https://github.com/glassypdm/glassypdm-client/commit/1ab33a2458be1cd1f168becca67a5e2b1f2b91d8))
* improved login feedback ([aec76b8](https://github.com/glassypdm/glassypdm-client/commit/aec76b854a44c93a7126db97bb23df8ab990c7d6))
* large commits are broken into smaller ones automatically ([f58c894](https://github.com/glassypdm/glassypdm-client/commit/f58c8947bf246385f5f8c38fd393b582fcd86d00))
* redesign settings for changing server folder location ([17ac12b](https://github.com/glassypdm/glassypdm-client/commit/17ac12b2b2aed4603fdcb059397da29bc7d70456))
* refactor get uploads function ([06d53ec](https://github.com/glassypdm/glassypdm-client/commit/06d53ece97e05c75f4b01ca11c80b8c65cef0824))
* rewrote hashing project directory code ([7b32f2b](https://github.com/glassypdm/glassypdm-client/commit/7b32f2b143b82a1fc97a032b40c86a5aa1d23f4a))
* store file hashes in sqlite ([f3f7a86](https://github.com/glassypdm/glassypdm-client/commit/f3f7a86a33aa61ab4a1cf7cf53e5cb5503dbc156))
* use team name in project path ([a466472](https://github.com/glassypdm/glassypdm-client/commit/a466472a32d1567f8c1928931bdeea98370b5914))

## [0.5.1](https://github.com/joshtenorio/glassypdm-client/compare/v0.5.0...v0.5.1) (2024-04-10)


### Miscellaneous

* bump tauri version ([7b62a88](https://github.com/joshtenorio/glassypdm-client/commit/7b62a889b06866852ffc7cb0a177e3be1e320eaa))

## [0.5.0](https://github.com/joshtenorio/glassypdm-client/compare/v0.4.0...v0.5.0) (2024-02-20)


### Features

* add notification if upload goes wrong ([373e9cf](https://github.com/joshtenorio/glassypdm-client/commit/373e9cf286bbc38a94071e57155bd0d1a3a77776))
* hash project directory while downloading files ([2282b85](https://github.com/joshtenorio/glassypdm-client/commit/2282b8508e895e97c69b61c75d893bb713e56afb))
* server status is displayed on sidebar ([f05471c](https://github.com/joshtenorio/glassypdm-client/commit/f05471c6ac54cee4e37897759fa52740e26ce3b7))
* setup logging, add buttons for viewing log directory ([d6ca311](https://github.com/joshtenorio/glassypdm-client/commit/d6ca3119b40e21ead474e743b7187ef87a8ea397))
* update base hash while uploading ([9cacd46](https://github.com/joshtenorio/glassypdm-client/commit/9cacd4660309fb8636fbbfe96801880cb9702116))


### Bug Fixes

* file count total when resetting updated files is now correct ([9f4d0f5](https://github.com/joshtenorio/glassypdm-client/commit/9f4d0f5807b28068d34ff1410d799ad4818f6b1f))
* send change type on file created/modified ([1cde21c](https://github.com/joshtenorio/glassypdm-client/commit/1cde21c7be2320772d5a2b51845ae5faeeeccf90))
* styling in download/upload pages ([b5a980d](https://github.com/joshtenorio/glassypdm-client/commit/b5a980d7f5f4f166061737145640bb7e45117713))


### Miscellaneous

* a single instance of glassyPDM running at a time is now ensured ([822ac2d](https://github.com/joshtenorio/glassypdm-client/commit/822ac2dde958227c660ea7f4a1eac343bdcaccda))
* breaking up main.rs into different files ([0f55bda](https://github.com/joshtenorio/glassypdm-client/commit/0f55bda0c99253852d72cb0b931c43a9b86b4477))
* client doesn't freeze up while uploading files ([7eefafb](https://github.com/joshtenorio/glassypdm-client/commit/7eefafb5d90923732766ed4af7ca6c7d59a56ce5))
* implement concurrent downloads ([c912075](https://github.com/joshtenorio/glassypdm-client/commit/c9120753e1893f77d9b4c726055d5a6fe29564d6))
* millisecond timers are rounded ([b6eb231](https://github.com/joshtenorio/glassypdm-client/commit/b6eb2316f715f4eb8c593dbff4bd8dd07ea7e534))
* move sync logic to rust ([2c50092](https://github.com/joshtenorio/glassypdm-client/commit/2c50092f1ba4fe562a36b574068e61cf0381945d))
* Re-format settings page ([aa5a77d](https://github.com/joshtenorio/glassypdm-client/commit/aa5a77da893fe90e56c6392060a4917888072140))
* redesign workbench page ([fddd871](https://github.com/joshtenorio/glassypdm-client/commit/fddd871d22f70f7d06f9897c793819018a33a4e6))
* rewrite more upload/reset logic to rust ([46a5111](https://github.com/joshtenorio/glassypdm-client/commit/46a5111477812251c63073dba992844bfb8c91ec))
* update local s3 key store when syncing ([754c885](https://github.com/joshtenorio/glassypdm-client/commit/754c885d87db89c98341bb41eda124fac8c192ba))
* use constants for app data files and use update function ([0d1617d](https://github.com/joshtenorio/glassypdm-client/commit/0d1617d0e9191ad8482c5f14b46649b1f684e1e9))

## [0.4.0](https://github.com/joshtenorio/glassypdm-client/compare/v0.3.0...v0.4.0) (2023-11-05)


### Features

* Add delete local data button for debug/quick resets ([243545f](https://github.com/joshtenorio/glassypdm-client/commit/243545fe01505d7e85a3b36f9ea984c6ab582e83))
* improve download feedback ([e45ccad](https://github.com/joshtenorio/glassypdm-client/commit/e45ccad6cc9c5047227203545580d31b1dc4944b))
* Improve upload page feedback and make it take the entire window ([a5c1118](https://github.com/joshtenorio/glassypdm-client/commit/a5c111891e8ffc7d518d945306c893939a31249b))
* Upload change type to server ([54d7868](https://github.com/joshtenorio/glassypdm-client/commit/54d7868479a2964dfb0e914d961f98839a9cd33e))


### Bug Fixes

* Properly update toDownload.json when downloading ([ebf5c23](https://github.com/joshtenorio/glassypdm-client/commit/ebf5c23ec0fd3f5892c04f23aededaae845a524e))


### Miscellaneous

* improve download speed ([2f10abe](https://github.com/joshtenorio/glassypdm-client/commit/2f10abe8f829ddf7f806c4ffcf8488fd0666b0f7))

## [0.3.0](https://github.com/joshtenorio/glassypdm-client/compare/v0.2.0...v0.3.0) (2023-10-26)


### Features

* disable actions while downloading/uploading/setting permission ([ac31295](https://github.com/joshtenorio/glassypdm-client/commit/ac31295806e9ca071dc20d8715aae5418f307a89))
* project directory is set without hitting save changes ([fb028f3](https://github.com/joshtenorio/glassypdm-client/commit/fb028f3863cc148c993e4c26e0609e0d7711cc59))
* project history is a little smarter ([6fea5c7](https://github.com/joshtenorio/glassypdm-client/commit/6fea5c7fe2bf92922f35b0832b308e8359247c5f))


### Bug Fixes

* Conflict dialog has a scrollbar now ([e815a0d](https://github.com/joshtenorio/glassypdm-client/commit/e815a0dcb717efb39048621c94f71847cccd6fbf))
* files marked for uploading are ignored when downloading new changes ([cf97efc](https://github.com/joshtenorio/glassypdm-client/commit/cf97efc5a5a2471203bac383bf548831cd65b2e7))


### Miscellaneous

* handle more invalid server url inputs ([78fc10d](https://github.com/joshtenorio/glassypdm-client/commit/78fc10d9b0e67900e26838fc7f7a03b86121432f))

## [0.2.0](https://github.com/joshtenorio/glassypdm-client/compare/v0.1.1...v0.2.0) (2023-10-11)


### Features

* detect file conflicts ([f9bf147](https://github.com/joshtenorio/glassypdm-client/commit/f9bf14735a3a9b1990c39d4ebf98194a433b0585))
* eligible users can set permissions for others ([9ebb67b](https://github.com/joshtenorio/glassypdm-client/commit/9ebb67bda13572a0dec849d5c53f16bd39c3c535))
* Open project folder button ([6c846c5](https://github.com/joshtenorio/glassypdm-client/commit/6c846c5c83b017fd9b70c89a1dbaf3029f348fb5))
* open project website button ([62aa638](https://github.com/joshtenorio/glassypdm-client/commit/62aa63847288fa63de36237c7b4af758a6475f24))
* prevent uploads if user doesn't have write permissions ([09177b9](https://github.com/joshtenorio/glassypdm-client/commit/09177b9844e69321e296ad87646db972c440e36e))
* prevent workspace actions if client is outdated ([da9ac65](https://github.com/joshtenorio/glassypdm-client/commit/da9ac65e74c91d694d762bca509dcf80758c9801))
* save s3key on file upload ([a9e1dbb](https://github.com/joshtenorio/glassypdm-client/commit/a9e1dbb16e79d5257c51f262158143a923ebfad3))


### Bug Fixes

* reset file to proper revision ([0cbdec7](https://github.com/joshtenorio/glassypdm-client/commit/0cbdec78ffa1a3b364910931a4201e66471fd1bf))

## [0.1.1](https://github.com/joshtenorio/glassypdm-client/compare/v0.1.0...v0.1.1) (2023-10-07)


### Bug Fixes

* json files are cleared before writing ([6e2dbd3](https://github.com/joshtenorio/glassypdm-client/commit/6e2dbd3223e1bc739a40c4342e737f26f870168d))

## [0.1.0](https://github.com/joshtenorio/glassypdm-client/compare/v0.1.0-1...v0.1.0) (2023-10-06)


### Features

* about page ([5e5d901](https://github.com/joshtenorio/glassypdm-client/commit/5e5d901ee5a5643cb5042bd7defca6942409456c))
* allow for resetting files ([07af101](https://github.com/joshtenorio/glassypdm-client/commit/07af10132e3097a95451dc51696ab23745fc9d95))
* authentication with clerk ([a5aacb0](https://github.com/joshtenorio/glassypdm-client/commit/a5aacb09b286e6fda66c6968fccff7a73430814b))
* break out config into client settings page ([bb4e311](https://github.com/joshtenorio/glassypdm-client/commit/bb4e3110bb1ab2959a8b32d63d3d9c888d083a85))
* download files page ([12eab57](https://github.com/joshtenorio/glassypdm-client/commit/12eab57bda55147712f814cf397a5d5b7b0e9f55))
* initialize download state in workbench page ([4f2e31d](https://github.com/joshtenorio/glassypdm-client/commit/4f2e31d9a326353ccf97635909212c05bf4add68))
* notification popup when settings are saved ([135c714](https://github.com/joshtenorio/glassypdm-client/commit/135c714be8f7855dbd36a9eeca8df67a187ab94f))
* redirect to settings if client is unconfigured ([76b926b](https://github.com/joshtenorio/glassypdm-client/commit/76b926b0851edc6faa98bbfb030af81fa0e88af3))
* show 3 most recent commits ([300e193](https://github.com/joshtenorio/glassypdm-client/commit/300e193dbf7d9b193fd63fd9854a7fddd71c09ed))
* sidebar buttons use NavLink instead of Link ([3f6dbe2](https://github.com/joshtenorio/glassypdm-client/commit/3f6dbe25edd10c1df82f1c1e1429e03a192c66bb))
* split app into pages ([2d27c2a](https://github.com/joshtenorio/glassypdm-client/commit/2d27c2a08a1ab856d67fe1fe43b9d5b629edc562))
* UI feedback when syncing with server ([b880fd8](https://github.com/joshtenorio/glassypdm-client/commit/b880fd8762aae2485c04ee7faf35369896e34792))
* upload files page ([d3fd059](https://github.com/joshtenorio/glassypdm-client/commit/d3fd0591dd42779842c111848792287d65345278))
* Upload page UI complete ([92dd5f7](https://github.com/joshtenorio/glassypdm-client/commit/92dd5f713fe095a0e78972bffbf0c960e602c505))


### Bug Fixes

* successful sign in no longer leads to 404 ([16cff9e](https://github.com/joshtenorio/glassypdm-client/commit/16cff9e1f78652c405169822b7dcb76cbc4c9502))

## 0.1.0-1 (2023-09-27)


### Features

* initial alpha version ([edeef15](https://github.com/joshtenorio/glassypdm-client/commit/edeef1530834e7d244576c65f18f2b390bd69d45))
