let
  pkgs = import <nixpkgs> { };

  libraries = [
    pkgs.at-spi2-atk
    pkgs.atkmm
    pkgs.cairo
    pkgs.gdk-pixbuf
    pkgs.glib
    pkgs.glib-networking
    pkgs.gtk3
    pkgs.harfbuzz
    pkgs.librsvg
    pkgs.libsoup_3
    pkgs.pango
    pkgs.webkitgtk_4_1
    pkgs.openssl
    pkgs.xdotool
    pkgs.gsettings-desktop-schemas
    pkgs.dconf
    pkgs.adwaita-icon-theme
  ];

  linkedLibraries = [
    pkgs.libappindicator
  ];
in
pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    rustc
    gcc
    pkg-config
    gobject-introspection
    cargo
    cargo-tauri
    nodejs
    curl
    wget
    file
  ];

  buildInputs = libraries ++ linkedLibraries;

  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath linkedLibraries;
    GIO_MODULE_DIR = "${pkgs.glib-networking}/lib/gio/modules/";
    XDG_DATA_DIRS = "${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:${pkgs.adwaita-icon-theme}/share:$XDG_DATA_DIRS";
    GTK_THEME = "Adwaita";
  };

  shellHook = ''
    echo -e "\033[1;32mWelcome to the Trøkk development environment!\033[0m"
    export PS1="\\[\\033[1;33m\\][nix-shell:trokk] \\[\\033[0m\\]\\u@\\h:\\w\\$"

    # GTK/WebKitGTK schema setup for proper CSS rendering
    export GSETTINGS_SCHEMA_DIR="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}/glib-2.0/schemas:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}/glib-2.0/schemas"

    # Fix for impure path issue
    export CARGO_TARGET_DIR="$PWD/target"
    export RUSTFLAGS="-C link-arg=-Wl,-rpath,$CARGO_TARGET_DIR/debug/deps"


    # AppImage bundling settings - NO_STRIP keeps debug symbols, APPIMAGE_BUNDLE_ALL bundles all deps
    export NO_STRIP=1
    export APPIMAGE_BUNDLE_ALL=1

    # Environment variables ensurance
    # if [ -f .env ]; then set -a; . .env; set +a; fi
    # echo -e "\033[1;33mChecking environment variables is set according to README.md\033[0m"
    # required_vars=($(awk '/^### Krevde environment variabler/{flag=1; next} /^### /{flag=0} flag' README.md | grep -P "\| \`" | grep -oP "\`.*\`" | sed "s/\`//g"))
    # for var in ''${required_vars[@]}; do
    #   if [ -z ''${!var} ]; then
    #     echo -e "\033[1;31m\n==============================\nWARNING: Required environment variable '$var' is not set.\n==============================\033[0m"
    #   fi
    # done

    # # Optional: only start the dev server if requested
    # if [ "$START_DEV" = "1" ]; then
    #   npm run tauri dev
    # fi

    # Helper function to build for production
    #  build_production() {
    #   echo -e "\033[1;32mBuilding Trøkk for production with bundled AppImage...\033[0m"
    #   npm run tauri build
    # }
  '';
}
