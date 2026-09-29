#!/usr/bin/env python3
"""Transforma o build em um arquivo único, que abre sem servidor.

O build (`vite-plugin-singlefile`) já embute o JavaScript, o CSS, as fontes e
as fotos. O que sobra são quatro caminhos no cabeçalho — favicon, dois ícones
e o manifest. Aqui eles viram dados embutidos e o manifest sai de cena (não
faz sentido sem origem), então o resultado abre por duplo clique, offline,
de qualquer pasta.

Uso: tools/arquivo-unico.py <pasta-dist> <saida.html>
"""

import base64
import pathlib
import re
import sys

dist = pathlib.Path(sys.argv[1])
saida = pathlib.Path(sys.argv[2])


def dados(caminho: str, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode((dist / caminho).read_bytes()).decode()}"


texto = (dist / 'index.html').read_text()
texto = texto.replace('href="./favicon.svg"', f'href="{dados("favicon.svg", "image/svg+xml")}"')
texto = texto.replace('href="./icons/icon-192.png"', f'href="{dados("icons/icon-192.png", "image/png")}"')
texto = texto.replace('href="./icons/apple-touch-icon.png"', f'href="{dados("icons/apple-touch-icon.png", "image/png")}"')
texto = re.sub(r'\s*<link rel="manifest"[^>]*>', '', texto)

saida.write_text(texto)
print(f"arquivo único: {saida} ({round(len(texto) / 1e6, 2)} MB) — abra por duplo clique, sem servidor")
