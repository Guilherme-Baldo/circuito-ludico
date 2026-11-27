/*
 * Circuito Lúdico – firmware do kit (Arduino Uno)
 * Projeto de extensão ELLP – UTFPR Câmpus Cornélio Procópio
 *
 * Desafios:
 *   - Genius de cores: máquina de estados + vetor de sequência sorteada
 *   - Ohmímetro lúdico: divisor de tensão com Rref = 10 kΩ, média de 16 leituras,
 *     busca binária do valor comercial E12 mais próximo
 *
 * Ligações (ver hardware/memoria-de-calculo.md):
 *   D2..D5  LEDs vermelho, amarelo, verde, azul (cada um com 220 Ω)
 *   D8      buzzer ativo 5 V
 *   A0      escada de 4 botões: pull-up 10 kΩ ao 5 V; botões ao GND por 0, 2,2 k, 4,7 k e 10 kΩ;
 *           capacitor de 1 µF do A0 ao GND (τ = 10 ms)
 *   A1      nó do ohmímetro: Rref 10 kΩ (1%) ao 5 V, resistor desconhecido ao GND
 *   A5      desconectado (ruído para a semente aleatória)
 *
 * Protocolo serial: 115200 baud, uma mensagem JSON por linha (ver web/src/kit/Kit.js).
 * Não usa bibliotecas externas, então roda também no simulador do Tinkercad Circuits.
 */

// ------------------------------------------------------------------ pinos
const uint8_t PINOS_LED[4] = {2, 3, 4, 5};
const uint8_t PINO_BUZZER = 8;
const uint8_t PINO_BOTOES = A0;
const uint8_t PINO_OHM = A1;
const uint8_t PINO_SEMENTE = A5;

// ------------------------------------------------------------------ constantes de circuito
const float ADC_MAX = 1023.0;
const int LIMIARES_BOTOES[4] = {92, 256, 420, 768};   // pontos médios entre 0, 184, 327, 512 e 1023
const uint8_t JANELA_MEDIA = 8;                        // média móvel da escada de botões
const unsigned long PERIODO_AMOSTRA_MS = 5;
const unsigned long TEMPO_CONFIRMA_MS = 50;           // 5τ do filtro RC
const uint8_t AMOSTRAS_OHM = 16;
float rRef = 10000.0;                                  // ajustado pelo comando "calibrar"

// ------------------------------------------------------------------ Genius
const uint8_t MAX_RODADAS = 32;
enum Estado { OCIOSO, MOSTRANDO, AGUARDANDO, ACERTO, FIM };
Estado estado = OCIOSO;
uint8_t sequencia[MAX_RODADAS];
uint8_t tamanho = 0;        // rodada atual = tamanho da sequência
uint8_t indice = 0;         // posição sendo mostrada ou conferida
bool ledLigado = false;
unsigned long proximoPasso = 0;

// ------------------------------------------------------------------ leitura dos botões
int amostras[JANELA_MEDIA];
uint8_t posAmostra = 0;
unsigned long ultimaAmostra = 0;
int8_t candidato = -1;
unsigned long desdeCandidato = 0;
int8_t botaoEstavel = -1;

// ------------------------------------------------------------------ buzzer e LED de resposta
unsigned long desligarBuzzerEm = 0;
int8_t ledResposta = -1;
unsigned long apagarRespostaEm = 0;

// ------------------------------------------------------------------ serial
char linha[64];
uint8_t tamLinha = 0;

void terminar(const char *motivo);  // declarada antes do uso (novaRodada chama terminar)

// =================================================================== utilidades de saída
void enviarEvento(const char *evt) {
  Serial.print(F("{\"evt\":\""));
  Serial.print(evt);
  Serial.println(F("\"}"));
}

void enviarEventoN(const char *evt, const char *campo, long valor) {
  Serial.print(F("{\"evt\":\""));
  Serial.print(evt);
  Serial.print(F("\",\""));
  Serial.print(campo);
  Serial.print(F("\":"));
  Serial.print(valor);
  Serial.println(F("}"));
}

void enviarLed(uint8_t id, bool aceso) {
  Serial.print(F("{\"evt\":\"led\",\"id\":"));
  Serial.print(id);
  Serial.print(F(",\"aceso\":"));
  Serial.print(aceso ? F("true") : F("false"));
  Serial.println(F("}"));
}

void acenderLed(uint8_t id, bool aceso) {
  digitalWrite(PINOS_LED[id], aceso ? HIGH : LOW);
  enviarLed(id, aceso);
}

void bipe(unsigned int ms) {
  digitalWrite(PINO_BUZZER, HIGH);
  desligarBuzzerEm = millis() + ms;
}

// =================================================================== série E12 e busca binária
const uint8_t BASE_E12[12] = {10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82};
const uint8_t TOTAL_E12 = 73;  // 10 Ω a 820 kΩ (72 valores) + 1 MΩ

long valorE12(uint8_t i) {
  if (i >= TOTAL_E12 - 1) return 1000000L;
  long v = BASE_E12[i % 12];
  for (uint8_t d = 0; d < i / 12; d++) v *= 10;
  return v;
}

long e12MaisProximo(float r) {
  if (r <= valorE12(0)) return valorE12(0);
  if (r >= valorE12(TOTAL_E12 - 1)) return valorE12(TOTAL_E12 - 1);
  uint8_t lo = 0, hi = TOTAL_E12 - 1;          // invariante: E12[lo] <= r < E12[hi]
  while (hi - lo > 1) {
    uint8_t meio = (lo + hi) / 2;
    if (valorE12(meio) <= r) lo = meio;
    else hi = meio;
  }
  // compara em razão (escala logarítmica), como a série foi construída
  return (r / valorE12(lo) <= valorE12(hi) / r) ? valorE12(lo) : valorE12(hi);
}

// =================================================================== ohmímetro
float lerMediaOhm() {
  long soma = 0;
  for (uint8_t i = 0; i < AMOSTRAS_OHM; i++) {
    soma += analogRead(PINO_OHM);
    delay(2);
  }
  return soma / (float)AMOSTRAS_OHM;
}

void medir() {
  float n = lerMediaOhm();
  if (n > ADC_MAX - 5) {           // nada no soquete: o Rref puxa o nó para 5 V
    Serial.println(F("{\"evt\":\"ohm\",\"aberto\":true}"));
    return;
  }
  if (n < 2) {
    Serial.println(F("{\"evt\":\"ohm\",\"curto\":true}"));
    return;
  }
  float rx = rRef * n / (ADC_MAX - n);         // Rx = Rref · n / (1023 − n)
  Serial.print(F("{\"evt\":\"ohm\",\"rx\":"));
  Serial.print((long)(rx + 0.5));
  Serial.print(F(",\"e12\":"));
  Serial.print(e12MaisProximo(rx));
  Serial.print(F(",\"adc\":"));
  Serial.print((int)(n + 0.5));
  Serial.println(F("}"));
}

void calibrar(float rConhecido) {
  float n = lerMediaOhm();
  if (rConhecido <= 0 || n <= 2 || n >= ADC_MAX - 5) {
    Serial.println(F("{\"evt\":\"erro\",\"msg\":\"Encaixe o resistor de calibracao no soquete.\"}"));
    return;
  }
  rRef = rConhecido * (ADC_MAX - n) / n;       // Rref = Rx · (1023 − n) / n
  enviarEventoN("calibrado", "rref", (long)(rRef + 0.5));
}

// =================================================================== botões (escada no A0)
int8_t classificar(int leitura) {
  for (uint8_t i = 0; i < 4; i++) {
    if (leitura < LIMIARES_BOTOES[i]) return i;
  }
  return -1;
}

/** Amostra o A0 a cada 5 ms; devolve o botão quando um novo aperto é confirmado, senão -1. */
int8_t lerBotoes() {
  unsigned long agora = millis();
  if (agora - ultimaAmostra < PERIODO_AMOSTRA_MS) return -1;
  ultimaAmostra = agora;

  amostras[posAmostra] = analogRead(PINO_BOTOES);
  posAmostra = (posAmostra + 1) % JANELA_MEDIA;
  long soma = 0;
  for (uint8_t i = 0; i < JANELA_MEDIA; i++) soma += amostras[i];
  int8_t atual = classificar(soma / JANELA_MEDIA);

  if (atual != candidato) {          // mudou: recomeça a contar o tempo
    candidato = atual;
    desdeCandidato = agora;
    return -1;
  }
  if (agora - desdeCandidato < TEMPO_CONFIRMA_MS || atual == botaoEstavel) return -1;

  int8_t anterior = botaoEstavel;
  botaoEstavel = atual;
  return (anterior == -1 && atual >= 0) ? atual : -1;   // só a borda "solto -> apertado"
}

// =================================================================== Genius
unsigned int tempoLed() {
  int t = 600 - 30 * (tamanho - 1);
  return t < 200 ? 200 : t;
}

void apagarTodos() {
  for (uint8_t i = 0; i < 4; i++) digitalWrite(PINOS_LED[i], LOW);
}

void novaRodada() {
  if (tamanho >= MAX_RODADAS) {
    terminar("vitoria");
    return;
  }
  sequencia[tamanho++] = random(4);
  enviarEventoN("rodada", "n", tamanho);
  estado = MOSTRANDO;
  indice = 0;
  ledLigado = false;
  proximoPasso = millis() + 700;
}

void iniciarGenius() {
  apagarTodos();
  tamanho = 0;
  novaRodada();
}

void terminar(const char *motivo) {
  if (estado == OCIOSO || estado == FIM) return;
  apagarTodos();
  int pontos = (strcmp(motivo, "vitoria") == 0) ? tamanho : (tamanho > 0 ? tamanho - 1 : 0);
  estado = FIM;
  Serial.print(F("{\"evt\":\"fim\",\"pontos\":"));
  Serial.print(pontos);
  Serial.print(F(",\"motivo\":\""));
  Serial.print(motivo);
  Serial.println(F("\"}"));
  if (strcmp(motivo, "erro") == 0) bipe(600);
}

void passoGenius(int8_t botao) {
  unsigned long agora = millis();

  switch (estado) {
    case MOSTRANDO:
      if ((long)(agora - proximoPasso) < 0) break;
      if (!ledLigado) {
        acenderLed(sequencia[indice], true);
        ledLigado = true;
        proximoPasso = agora + tempoLed();
      } else {
        acenderLed(sequencia[indice], false);
        ledLigado = false;
        indice++;
        proximoPasso = agora + 150;
        if (indice >= tamanho) {
          estado = AGUARDANDO;
          indice = 0;
          enviarEvento("sua_vez");
        }
      }
      break;

    case AGUARDANDO:
      if (botao < 0) break;
      enviarEventoN("botao", "id", botao);
      acenderLed(botao, true);
      ledResposta = botao;
      apagarRespostaEm = agora + 180;
      if (botao != sequencia[indice]) {
        terminar("erro");
        break;
      }
      indice++;
      if (indice >= tamanho) {
        estado = ACERTO;
        enviarEventoN("acerto", "n", tamanho);
        bipe(80);
        proximoPasso = agora + 600;
      }
      break;

    case ACERTO:
      if ((long)(agora - proximoPasso) >= 0) novaRodada();
      break;

    default:
      break;
  }
}

// =================================================================== comandos
void tratarComando(const char *cmd) {
  if (strstr(cmd, "\"ping\"")) {
    Serial.println(F("{\"evt\":\"pronto\",\"versao\":\"1.0\"}"));
  } else if (strstr(cmd, "\"genius\"")) {
    iniciarGenius();
  } else if (strstr(cmd, "\"parar\"")) {
    terminar("parado");
  } else if (strstr(cmd, "\"medir\"")) {
    medir();
  } else if (strstr(cmd, "\"calibrar\"")) {
    const char *r = strstr(cmd, "\"r\":");
    calibrar(r ? atof(r + 4) : 0);
  } else {
    Serial.println(F("{\"evt\":\"erro\",\"msg\":\"comando desconhecido\"}"));
  }
}

void lerSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (tamLinha > 0) {
        linha[tamLinha] = '\0';
        tratarComando(linha);
        tamLinha = 0;
      }
    } else if (tamLinha < sizeof(linha) - 1) {
      linha[tamLinha++] = c;
    } else {
      tamLinha = 0;  // linha longa demais: descarta
    }
  }
}

// =================================================================== setup e loop
void setup() {
  Serial.begin(115200);
  for (uint8_t i = 0; i < 4; i++) pinMode(PINOS_LED[i], OUTPUT);
  pinMode(PINO_BUZZER, OUTPUT);
  randomSeed(analogRead(PINO_SEMENTE));
  for (uint8_t i = 0; i < JANELA_MEDIA; i++) amostras[i] = 1023;

  // teste rápido dos LEDs ao ligar
  for (uint8_t i = 0; i < 4; i++) {
    digitalWrite(PINOS_LED[i], HIGH);
    delay(120);
    digitalWrite(PINOS_LED[i], LOW);
  }
  Serial.println(F("{\"evt\":\"pronto\",\"versao\":\"1.0\"}"));
}

void loop() {
  unsigned long agora = millis();
  lerSerial();
  int8_t botao = lerBotoes();
  passoGenius(botao);

  if (desligarBuzzerEm && (long)(agora - desligarBuzzerEm) >= 0) {
    digitalWrite(PINO_BUZZER, LOW);
    desligarBuzzerEm = 0;
  }
  if (ledResposta >= 0 && (long)(agora - apagarRespostaEm) >= 0) {
    acenderLed(ledResposta, false);
    ledResposta = -1;
  }
}
