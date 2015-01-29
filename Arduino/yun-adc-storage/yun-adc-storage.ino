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
      request += convertToBase32(analogRead(0));
    }
  
    sendRequest(request);
  }
}


void processClientRequest(YunClient client) {
  String request = client.readString();
  request.trim();
  
  if(request == "collect") {
    getData = true;
    client.print(F("Starting data collection"));
  }
  
  if(request == "stop") {
    getData = false;
    client.print(F("Stopping data collection"));
  }
}


String writeValue(String request,int ADCValue) {
  String value = convertToBase32(ADCValue);
  
  return request + value;
}


void sendRequest(String request) {
  Process p;
  
  p.begin("curl");
  p.addParameter(request);
  p.run();
}

  
String convertToBase32(int decVal) {
  String base32Val = "";
  
  for(int i = 1; i >= 0; i--) {
    int currentVal = ((int)floor(decVal/pow(32,i)) % 32);
    if(currentVal < 10) {
      base32Val += (char) (currentVal + '0'); 
    } else if (currentVal >= 10){
      base32Val += (char) (currentVal - 10 + 'A');
    }
  }
  
  return base32Val;
}
