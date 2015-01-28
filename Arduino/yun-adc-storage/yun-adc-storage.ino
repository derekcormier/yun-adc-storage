#include<Process.h>

void setup() {
  Bridge.begin();  
  Serial.begin(9600);
}

void loop() {
  char request[300] = "http://192.168.1.10:3000/rec/"; 
  bool isFirstDatum = true; 
  while(strlen(request) < 300) {
    if(!isFirstDatum) {
       strcat(request, ",");
    }
    delay(150);
    writeValue(request, analogRead(0));
    isFirstDatum = false;
  }
  sendRequest(request);
}

char *writeValue(char request[],int ADCValue) {
  char value[6];
  
  sprintf(value, "%d", ADCValue);
  strcat(request, value); 
  
  return (char *) request;
}

void sendRequest(char request[]) {
  Process p;
  
  Serial.println(request);
  
  p.begin("curl");
  p.addParameter(request);
  p.run();
}
  
