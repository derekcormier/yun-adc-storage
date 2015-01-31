#include<Bridge.h>
#include<Process.h>
#include<YunServer.h>
#include<YunClient.h>
#include <avr/pgmspace.h>

PROGMEM const char LARGEST_ULONG_BASE_32_LEN = 7;

YunServer server;
bool getData = false;
bool beginDataCollection = false;
unsigned long dataCollectionStartTime = 0;

void setup() {
  Bridge.begin();  
  Serial.begin(9600);
  
  server.listenOnLocalhost();
  server.begin();
}

void loop() {
  YunClient client = server.accept();
  
  if(client) {
    processClientRequest(client);
   
    client.stop();
  }
  
  if(getData == true) {
    Serial.println(F("Recording..."));
    
    bool isFirstDatum = true;
    String request = F("http://192.168.1.10:3000/rec/");
  
    if(beginDataCollection) {
      dataCollectionStartTime = millis();
      beginDataCollection = false; 
    }
  
    while(request.length() < 300) {
      unsigned long timeOfMeasurement = millis() - dataCollectionStartTime;
      Serial.println(millis());
      Serial.println(millis() - dataCollectionStartTime);
      int adcValue = analogRead(0);
      
      if(isFirstDatum) {
        isFirstDatum = false;
      } else {
        request += ",";
      }
      request += convertToBase32((long)adcValue, 2);
      request += convertToBase32(timeOfMeasurement, 
                                 getBase32StringLength(timeOfMeasurement));
                                 
      delay(100);
    }
  
    Serial.println(request);
  
    sendRequest(request);
  }
}


void processClientRequest(YunClient client) {
  String request = client.readString();
  request.trim();
  
  if(request == "collect") {
    getData = true;
    beginDataCollection = true;
    Serial.println(F("Starting data collection"));
  }
  
  if(request == "stop") {
    getData = false;
    Serial.println(F("Stopping data collection"));
  }
}


void sendRequest(String request) {
  Process p;
  
  p.begin("curl");
  p.addParameter(request);
  p.run();
}

  
String convertToBase32(unsigned long decVal, int strLen) {
  String base32Val = "";
  
  for(int i = (strLen - 1); i >= 0; i--) {
    int currentVal = ((int)floor(decVal/pow(32,i)) % 32);
    if(currentVal < 10) {
      base32Val += (char) (currentVal + '0'); 
    } else if (currentVal >= 10){
      base32Val += (char) (currentVal - 10 + 'A');
    }
  }
  return base32Val;
}

int getBase32StringLength(unsigned long decVal) {
  for(int i = 1; i < LARGEST_ULONG_BASE_32_LEN; i++){
    if(decVal < pow(32, i)) {
      return i; 
    }
  }
}
