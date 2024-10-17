# glassyPDM
glassyPDM is a PDM solution for teams looking to collaborate on hardware design.
## Support
Create a ticket [here](https://github.com/joshtenorio/glassypdm-client/issues).
## Dev Instructions
### Prerequisites
- pnpm
- Windows computer setup for Tauri development. [link](https://tauri.app/v1/guides/getting-started/prerequisites)
- Clerk account setup. [link](https://clerk.com/)
- An instance of the glassyPDM [server](https://github.com/joshtenorio/glassypdm-server) and [webapp](https://github.com/joshtenorio/glassypdm-web) running somewhere.
### CLI
```powershell
# build activities
$ pnpm install

# for development
$ pnpm tauri dev

# for building installers, etc.
$ $env:TAURI_SIGNING_PRIVATE_KEY="Path or content of your private key"
$ pnpm tauri build
```
### Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## License
The glassyPDM client is released under the GNU General Public License (GPL) version 3 or later version.