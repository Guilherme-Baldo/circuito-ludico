# Memória de cálculo – Circuito Lúdico

Os valores abaixo são gerados por `python3 hardware/calculos.py` e são os mesmos usados no firmware
(`firmware/circuito_ludico/circuito_ludico.ino`) e na plataforma (`web/src/lib/algoritmos.js`).
Alimentação: 5 V da USB. ADC do ATmega328P: 10 bits (0 a 1023).

## 1. LEDs – Lei de Ohm

R = (Vcc − Vf) / I, com corrente-alvo de 15 mA.

| LED | Vf (aprox.) | R ideal | R adotado | I real | Potência no resistor |
| --- | --- | --- | --- | --- | --- |
| Vermelho / amarelo | 2,0 V | 200 Ω | 220 Ω | 13,6 mA | 40,9 mW |
| Verde / azul | 3,0 V | 133 Ω | 220 Ω | 9,1 mA | 18,2 mW |

Um único valor (220 Ω) simplifica a montagem; todas as correntes ficam abaixo dos 20 mA recomendados por
pino e as potências bem abaixo de 1/4 W.

## 2. Escada de botões – divisor de tensão no A0

Pull-up de 10 kΩ ao 5 V; cada botão liga o A0 ao GND por um resistor diferente (Rb).
V = 5 × Rb / (10 kΩ + Rb).

| Botão | Rb | Tensão | Leitura ADC |
| --- | --- | --- | --- |
| 0 – vermelho | 0 Ω | 0,00 V | 0 |
| 1 – amarelo | 2,2 kΩ | 0,90 V | 184 |
| 2 – verde | 4,7 kΩ | 1,60 V | 327 |
| 3 – azul | 10 kΩ | 2,50 V | 512 |
| nenhum | – | 5,00 V | 1023 |

Limiares de decisão (pontos médios): **92, 256, 420, 768**. A menor folga até um limiar é de 72 contagens
(0,35 V), muito acima do ruído do ADC e da tolerância de 5% dos resistores.

## 3. Filtro RC anti-repique

Capacitor de 1 µF do A0 ao GND, carregado pelo pull-up de 10 kΩ: τ = R × C = 10 ms.
Após 5τ = 50 ms o capacitor está com mais de 99% da tensão final; por isso o firmware só confirma um
botão quando a mesma classificação se mantém por 50 ms (além da média móvel de 8 amostras a cada 5 ms).

## 4. Ohmímetro – divisor com resistor de referência

Rref = 10 kΩ (1%) entre 5 V e A1; o resistor desconhecido Rx entre A1 e GND.

- Leitura: n = 1023 × Rx / (Rref + Rx)
- Inversão: **Rx = Rref × n / (1023 − n)**
- Erro causado por 1 contagem: 1023 / [n × (1023 − n)]

| Rx | Tensão | Leitura | Erro por contagem |
| --- | --- | --- | --- |
| 1 kΩ | 0,455 V | 93 | 1,18% |
| 2,2 kΩ | 0,902 V | 184 | 0,66% |
| 4,7 kΩ | 1,599 V | 327 | 0,45% |
| 10 kΩ | 2,500 V | 512 | 0,39% |
| 22 kΩ | 3,438 V | 703 | 0,45% |
| 47 kΩ | 4,123 V | 844 | 0,68% |
| 100 kΩ | 4,545 V | 930 | 1,18% |

Faixa útil: 1 kΩ a 100 kΩ (erro de quantização ≤ 1,2%). O firmware tira a média de 16 leituras.

**Calibração:** com um resistor conhecido (10 kΩ de precisão) no soquete, o firmware calcula
Rref = Rconhecido × (1023 − n) / n, corrigindo a tolerância do Rref.

## 5. Associação de resistores (Monte o circuito)

- Série: Req = R1 + R2
- Paralelo: Req = R1 × R2 / (R1 + R2)
- Misto: Req = R1 + (R2 ∥ R3)

Peças do kit: 2× 1 kΩ, 2× 2,2 kΩ, 2× 4,7 kΩ, 2× 10 kΩ, 1× 22 kΩ, 1× 47 kΩ.
Os alvos são gerados enumerando todas as combinações das peças (sem repetir a mesma peça) e mantendo só
os resultados entre 1 kΩ e 100 kΩ. A resposta é aceita com erro de até ±5%.

## 6. Consumo

Pior caso dos circuitos do kit: 1 LED aceso (13,6 mA) + escada (0,5 mA) + ohmímetro em curto (0,5 mA)
+ buzzer ativo + placa. Bem abaixo dos 500 mA de uma porta USB; o valor total deve ser confirmado
com multímetro em série com a alimentação.

## 7. Validação

Para cada circuito, registrar na tabela: valor calculado, valor simulado (Tinkercad/Falstad) e valor
medido com multímetro, com o desvio percentual.
