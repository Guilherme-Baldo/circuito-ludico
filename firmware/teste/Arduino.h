// Mock mínimo da API do Arduino para testar o firmware com g++.
#pragma once
#include <cstdint>
#include <cstring>
#include <cstdlib>
#include <string>
#include <cstdio>
#define F(x) (x)
#define HIGH 1
#define LOW 0
#define OUTPUT 1
#define A0 14
#define A1 15
#define A5 19
typedef const char __FlashStringHelper;
extern unsigned long g_millis; extern int g_adc[20]; extern int g_pins[20];
inline unsigned long millis(){ return g_millis; }
inline void delay(unsigned long ms){ g_millis += ms; }
inline void pinMode(int,int){}
inline void digitalWrite(int p,int v){ g_pins[p]=v; }
inline int analogRead(int p){ return g_adc[p]; }
inline void randomSeed(long){ srand(42); }
inline long random(long m){ return rand()%m; }
struct SerialMock {
  std::string in, out;
  void begin(long){}
  int available(){ return in.size(); }
  char read(){ char c=in[0]; in.erase(0,1); return c; }
  template<class T> void print(T v){ out += std::to_string(v); }
  void print(const char* s){ out += s; }
  void print(char* s){ out += s; }
  template<class T> void println(T v){ print(v); out += "\n"; }
  void println(const char* s){ out += s; out += "\n"; }
};
extern SerialMock Serial;
