"""
Memória de cálculo do Circuito Lúdico.
Gera os valores usados no firmware e na plataforma. Rode: python3 hardware/calculos.py
"""
VCC = 5.0
ADC_MAX = 1023


def divisor(r_cima, r_baixo):
    """Tensão e leitura do ADC no nó de um divisor."""
    v = VCC * r_baixo / (r_cima + r_baixo)
    return v, round(ADC_MAX * r_baixo / (r_cima + r_baixo))


print("1) Resistor limitador dos LEDs (Lei de Ohm), alvo de 15 mA")
for cor, vf in [("vermelho", 2.0), ("amarelo", 2.0), ("verde", 3.0), ("azul", 3.0)]:
    r_ideal = (VCC - vf) / 0.015
    i_real = (VCC - vf) / 220
    print(f"   {cor:9s} Vf={vf:.1f} V  R ideal={r_ideal:5.0f} Ω  -> 220 Ω  I real={i_real*1000:4.1f} mA  P={i_real**2*220*1000:4.1f} mW")

print("\n2) Escada de botões no A0 (pull-up 10 kΩ)")
leituras = []
for i, rb in enumerate([0, 2200, 4700, 10_000]):
    v, n = divisor(10_000, rb)
    leituras.append(n)
    print(f"   botão {i}: Rb={rb:6d} Ω  V={v:4.2f} V  leitura={n}")
limiares = [round((a + b) / 2) for a, b in zip(leituras, leituras[1:] + [ADC_MAX])]
print(f"   limiares (pontos médios): {limiares}")
folga = min(b - a for a, b in zip(leituras, leituras[1:] + [ADC_MAX])) / 2
print(f"   folga mínima até o limiar: {folga:.0f} contagens = {folga * VCC / ADC_MAX:.2f} V")

print("\n3) Filtro RC anti-repique")
tau = 10_000 * 1e-6
print(f"   τ = 10 kΩ × 1 µF = {tau*1000:.0f} ms; 5τ = {5*tau*1000:.0f} ms (tempo de confirmação no firmware)")

print("\n4) Ohmímetro (Rref = 10 kΩ em cima, Rx embaixo)")
print("   Rx [Ω]    V [V]   leitura   erro por contagem")
for rx in [1000, 2200, 4700, 10_000, 22_000, 47_000, 100_000]:
    v, n = divisor(10_000, rx)
    erro = ADC_MAX / (n * (ADC_MAX - n))
    print(f"   {rx:7d}   {v:5.3f}   {n:5d}     {erro*100:4.2f}%")

print("\n5) Corrente do kit (estimativa, conferir com multímetro)")
i_led = (VCC - 2.0) / 220
i_ohm_max = VCC / 10_000
i_escada_max = VCC / 10_000
print(f"   1 LED aceso por vez: {i_led*1000:.1f} mA; ohmímetro em curto: {i_ohm_max*1000:.1f} mA; escada: {i_escada_max*1000:.1f} mA")
print("   + buzzer ativo e a própria placa (medir). Porta USB fornece até 500 mA.")
