// Teste do firmware no computador, sem Arduino: simula millis(), analogRead() e a Serial.
// Compile e rode:  g++ -std=c++17 -o teste teste.cpp && ./teste
#include "Arduino.h"
unsigned long g_millis=0; int g_adc[20]; int g_pins[20]; SerialMock Serial;
#include "../circuito_ludico/circuito_ludico.ino"
#include <vector>
#include <cassert>
#include <iostream>
#include <cmath>
std::string pegar(){ std::string o=Serial.out; Serial.out.clear(); return o; }
void rodar(unsigned long ms){ for(unsigned long i=0;i<ms;i++){ loop(); g_millis++; } }
int adcDivisor(double rcima,double rbaixo){ return (int)std::lround(1023.0*rbaixo/(rcima+rbaixo)); }
int main(){
  for(int i=0;i<20;i++) g_adc[i]=1023;
  setup(); std::cout<<pegar();
  // ohmimetro
  double testes[]={1000,2200,4700,10000,39000,82000};
  for(double r: testes){ g_adc[A1]=adcDivisor(10000,r); Serial.in="{\"cmd\":\"medir\"}\n"; rodar(1); std::cout<<pegar(); }
  g_adc[A1]=1023; Serial.in="{\"cmd\":\"medir\"}\n"; rodar(1); std::cout<<pegar();
  // calibracao com Rref real 10050
  g_adc[A1]=adcDivisor(10050,10000); Serial.in="{\"cmd\":\"calibrar\",\"r\":10000}\n"; rodar(1); std::cout<<pegar();
  // genius: jogar 4 rodadas corretas e errar a 5a
  int leit[4]={0,184,327,512};
  Serial.in="{\"cmd\":\"genius\"}\n";
  std::vector<int> seq; int rodadasOk=0;
  for(int r=1;r<=5;r++){
    seq.clear();
    // roda ate sua_vez
    for(int t=0;t<20000;t++){ loop(); g_millis++; std::string o=pegar();
      size_t p=0; while((p=o.find("\"led\",\"id\":",p))!=std::string::npos){ int id=o[p+11]-'0'; if(o.find("true",p)<o.find("}",p)) seq.push_back(id); p++; }
      if(o.find("sua_vez")!=std::string::npos) break; }
    if((int)seq.size()!=r){ std::cout<<"FALHA seq tamanho "<<seq.size()<<" rodada "<<r<<"\n"; return 1; }
    for(size_t i=0;i<seq.size();i++){
      int b = (r==5 && i==0) ? (seq[0]+1)%4 : seq[i];
      g_adc[A0]=leit[b]; rodar(120); g_adc[A0]=1023; rodar(120);
      std::string o=pegar();
      if(r==5){ std::cout<<o; break; }
      if(o.find("\"botao\",\"id\":"+std::to_string(b))==std::string::npos){ std::cout<<"FALHA botao "<<b<<" saida "<<o<<"\n"; return 1; }
      if(i+1==seq.size()) { assert(o.find("acerto")!=std::string::npos); rodadasOk++; }
    }
  }
  std::cout<<"rodadas corretas: "<<rodadasOk<<"\n";
  // botao segurado nao gera varios eventos
  return 0;
}
