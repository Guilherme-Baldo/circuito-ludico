# Manual de montagem do kit

Tempo estimado: 30 minutos. Não precisa soldar.

## Material (por kit)

- 1 Arduino Uno R3 + cabo USB
- 1 protoboard de 830 pontos e jumpers macho-macho
- 4 LEDs de 5 mm (vermelho, amarelo, verde, azul) e 4 resistores de 220 Ω
- 4 botões táteis, resistores de 2,2 kΩ, 4,7 kΩ e 10 kΩ (escada) e 1 resistor de 10 kΩ (pull-up)
- 1 capacitor eletrolítico de 1 µF
- 1 buzzer ativo de 5 V
- 1 resistor de 10 kΩ 1% (referência do ohmímetro) e 2 jumpers como "soquete"
- Gaveta de peças para os desafios: 2× 1 kΩ, 2× 2,2 kΩ, 2× 4,7 kΩ, 2× 10 kΩ, 22 kΩ, 47 kΩ

## Passo a passo

1. **Trilhas de alimentação:** 5 V do Arduino na trilha vermelha da protoboard; GND na azul.
2. **LEDs:** D2 → 220 Ω → anodo (perna longa) do LED vermelho → catodo ao GND. Repita: D3 amarelo,
   D4 verde, D5 azul.
3. **Buzzer:** D8 no terminal + do buzzer; terminal − ao GND.
4. **Escada de botões (A0):** resistor de 10 kΩ do 5 V até uma linha que vai ao A0.
   Dessa linha saem 4 botões: botão vermelho direto ao GND; botão amarelo ao GND por 2,2 kΩ;
   verde por 4,7 kΩ; azul por 10 kΩ. Capacitor de 1 µF do A0 ao GND (perna negativa no GND).
5. **Ohmímetro (A1):** resistor de 10 kΩ 1% do 5 V até uma linha ligada ao A1. Dois jumpers formam o
   soquete: um nessa linha, outro no GND. O resistor (ou a montagem) a medir fica entre eles.
6. **Firmware:** abra `firmware/circuito_ludico/circuito_ludico.ino` no Arduino IDE, escolha
   "Arduino Uno" e a porta, e clique em Carregar. Os 4 LEDs piscam em sequência ao ligar.
7. **Teste:** na plataforma, Conectar o kit → Kit pela USB. Depois faça a calibração com o resistor de
   10 kΩ de precisão no soquete.

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| LED não acende | LED invertido (perna longa vai no resistor) |
| Botão errado é reconhecido | Resistor da escada trocado; confira 2,2 k / 4,7 k / 10 k |
| Ohmímetro mostra "aberto" | Soquete sem contato ou Rref fora da linha do A1 |
| Plataforma não acha o kit | Use Chrome/Edge; feche o Monitor Serial do Arduino IDE |
