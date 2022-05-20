{ pkgs ? import <nixpkgs> { } }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs-16_x
    yarn
    docker-compose
  ];
}
