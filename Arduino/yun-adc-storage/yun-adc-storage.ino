#include<Process.h>
#include<math.h>

void setup() {
  Bridge.begin();  
  Serial.begin(9600);
}

void loop() {
  String request = "http://192.168.1.10:3000/rec/";
  while(request.length() < 300) {
    delay(150);
    request += convertToBase32(analogRead(0));
  }
  sendRequest(request);
}

String writeValue(String request,int ADCValue) {
  String value = convertToBase32(ADCValue);
  
  return request + value;
}

void sendRequest(String request) {
  Process p;
  
  Serial.println(request);
  
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
