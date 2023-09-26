# glassyPDM Client
## v0.1.0 roadmap
- [x] upload/download changed/new files
- [x] upload a deleted file
- [x] don't download deleted files
- [ ] delete a file if server says it was deleted
- [ ] for download/upload list: say if it is new file, updated file, or deleted
- [ ] improve feedback for knowing when files have downloaded/uploaded successfully/failed
- [ ] replace default Tauri icon, GPL compliance
- [ ] dedicated config menu
- [ ] ignore `$~` or `~$` files that solidworks makes
## Dev Instructions
```bash
# for development
$ yarn tauri dev

# for building installers, etc.
$ yarn tauri build
```
### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License
The glassyPDM client is released under the GNU General Public License (GPL) version 3 or later version.