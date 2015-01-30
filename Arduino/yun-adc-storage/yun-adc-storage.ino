#include<Bridge.h>
#include<Process.h>
#include<YunServer.h>
#include<YunClient.h>
#include<math.h>

YunServer server;
bool getData = false;

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
    Serial.println("Recording...");
    
    String request = "http://192.168.1.10:3000/rec/";
  
    while(request.length() < 300) {
      delay(150);
      
      unsigned long timeOfMeasurement = millis();
      int adcValue = analogRead(0);
      request += convertToBase32(timeOfMeasurement, 7);  // seven chars to fit largest unsigned long
      request += convertToBase32((long)adcValue, 2);
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
    Serial.print(F("Starting data collection"));
  }
  
  if(request == "stop") {
    getData = false;
    Serial.print(F("Stopping data collection"));
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
