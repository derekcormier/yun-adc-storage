#include<Bridge.h>
#include<Process.h>
#include<YunServer.h>
#include<YunClient.h>
#include <avr/pgmspace.h>

// String length of largest unsigned long value in base 32
PROGMEM const char LARGEST_ULONG_BASE_32_LEN = 7;

// Max string length of request to send to Meteor
// 315 is the optimized string length for largest E (~9.5)
PROGMEM const uint16_t REQUEST_STRING_LENGTH = 315;

// YunServer for REST calls
YunServer server;

// True if the user still wants data
bool getData = false;

// True before the first data is captured per recording session, to get
//   AVR time used to "zero" data caption time
bool beginDataCollection = false;

// System time when recording session started
unsigned long dataCollectionStartTime = 0;

unsigned int delayBetweenPoints = 0;

void setup() {
  // Init bridge between AVR and Linux
  Bridge.begin();
  
  // Allow the Yun to accept REST requests
  server.listenOnLocalhost();
  server.begin();
}

void loop() {
  // Connect to client, if there is one attempting to connect
  YunClient client = server.accept();
  
  if(client) {
    // Process the client's request
    processClientRequest(client);
    
    client.stop();
  }
  
  // If the client has asked to collect data, do so until they ask to stop
  if(getData == true) {
    
    // If the datum being collected is the first in this request
    bool isFirstDatum = true;
    String request = F("http://192.168.1.10:3000/rec/");
  
    // If this is the start of a collection session, get the current AVR time to
    //   shift the collection time to start at 0 ms.
    if(beginDataCollection) {
      dataCollectionStartTime = millis();
      beginDataCollection = false;
    }
  
    // If the request is not full, get more data to send (this method will allow
    //   the request to get larger by a few characters, but not enough to cause
    //   any issues)
    while(request.length() < REQUEST_STRING_LENGTH) {
      // Get measurement time
      unsigned long timeOfMeasurement = millis() - dataCollectionStartTime;
      // get ADC value
      int adcValue = analogRead(0);

      // If this the first datum, don't add a comma or delay
      if(isFirstDatum) {
        isFirstDatum = false;
      } else {
        // Only delay if this is not the first point. Could speed up collection rate
        //  if delay is large by not waiting after WiFi transmission
        delay(delayBetweenPoints);  // User defines delay
        request += ",";
      }
      
      // Add datum to request in format 'AABBBB' where:
      // 
      // AA   - ADC value in base 32 (always 2 chars long)
      // BBBB - time in milliseconds since start of recording in base 32 
      //          (variable length)
      request += convertToBase32((long)adcValue, 2);
      request += convertToBase32(timeOfMeasurement, 
                                 getBase32StringLength(timeOfMeasurement));
    }
    
    // Send the request to the Meteor sever to record
    sendRequest(request);
  }
}


// Processes the client's REST request
void processClientRequest(YunClient client) {
  String request = client.readStringUntil('/');
  request.trim();
  
  // Client wants to collect data
  //   /collect/{delayasint}  
  if(request == "collect") {
    getDelayBetweenPoints(client);
    getData = true;
    beginDataCollection = true;
  }
  
  // Client no longer wants to collect data
  //   /stop
  if(request == "stop") {
    getData = false;
  }
}

// Get the client specified delay
void getDelayBetweenPoints(YunClient client) {
  delayBetweenPoints = client.parseInt();
}


// Sends the request to Meteor to record
void sendRequest(String request) {
  // Initiate process to send to Linux via the Bridge
  Process p;
  
  p.begin("curl");
  p.addParameter(request);
  p.run();
}


// Converts long to base 32 string
String convertToBase32(unsigned long decVal, int strLen) {
  String base32Val = "";
  
  for(int i = (strLen - 1); i >= 0; i--) {
    int currentVal = ((int)floor(decVal/pow(32,i)) % 32);
    if(currentVal < 10) {
      base32Val += (char) (currentVal + '0');
    } else if (currentVal >= 10) {
      base32Val += (char) (currentVal - 10 + 'A');
    }
  }
  return base32Val;
}


// Gets the length that the base 32 string of a long would be 
int getBase32StringLength(unsigned long decVal) {
  for(int i = 1; i < LARGEST_ULONG_BASE_32_LEN; i++) {
    if(decVal < pow(32, i)) {
      return i;
    }
  }
}
