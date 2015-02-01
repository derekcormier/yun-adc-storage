# yun-adc-storage
A way to get large batches of ADC data from a Yún to a Meteor MongoDB server

The point of this project is to spend as little time as possible sending ADC data to Meteor and more time getting precious data!

## What you need
- An Arduino Yún
- The [beta or nightly build](http://arduino.cc/en/Main/Software) of Arduino (the Yún is unsupported in the non-beta release)
- [Meteor](https://www.meteor.com/)


## What is this project good for?

This project can be used for many things, but some applications are a better fit than others.

Some good applications:
- Capturing light sensor readings at a fairly slow rate, say, 4 times per second
- Reporting fermentation temperature of beer in a fermenter every minute (what I'll use it for!)
- For fun!

Some less-than-optimal applications:
- Viewing high-frequency signals
- Attempting to find a voltage spike that will only last a few milliseconds
- Trying to impress a love interest

Here's why. A picture is worth a thousand words:
![dash image](https://dl.dropboxusercontent.com/u/42052444/adc-yun-storage-cap.png "Why this project is bad for high frequency")

See those big gaps? Because the data is periodically sent over Wifi to a Meteor server, the transfer process can create large gaps in data that might "hide" important data from you. The device cannot record at the same time that it is sending data over WiFi.

You can make the data and graph better fit your purpose by modifying the delay and points to plot.

### User beware

If you would like to try to use this to for any of the less-than-optimal applications, you can sure go ahead and try, but here's a few things you should know:

- When the delay is set to 0, data points are taken, on average every 1.6 milliseconds. This means that (when it's actually sampling) it samples at about 625 Hz. This means that you could perhaps be able to visually make out a sinusoid at 156.25 Hz (1/4 the sampling rate), but it certainly wont be pretty. The intervals between data points are full milliseconds or more, so you will undoubtedly get a strange looking graph. Unfortunately I don't have access to a function generator to display this to you, but you get the idea. A sinusoid at 78.125Hz (1/8 the sampling rate) should be fairly recognizable, but you may not be able to make out precise things such as amplitude or period.
- You will be frustrated trying to use this as an oscilloscope. Don't do it unless you're desperate or a glutton for punishment.
 
## How to use it

### Setting it up:

1. Program `yun-adc-storage.ino` onto your Arduino Yún, and make sure you're on the same network
2. Navigate to the `/Meteor/yun-adc-storage` folder and run `sudo meteor`

*You will need to change the hostnames in order for this to work in your environment*

### Using the dashboard:

1. Navigate to `http://localhost:3000/dash`
2. Choose a delay within 0 to 60000
3. Choose how many points you would like plotted within 0 to 500
4. Click *Start collecting*. You will begin to see data from the Yún's 0th ADC port
5. When you're done collecting data, click *Stop collecting*. Your data will is saved in the Data MongoDB collection with the time being the milliseconds since epoch

## A few words on optimizing for efficiency

When trying to take collect and transmit measurements over WiFi with the Arduino Yún, one of the biggest issues is the time it takes to transmit the data. In this project, the data is sent in an HTTP request to a Meteor server to be recorded. To measure efficiency, we will use the following equation:

```
E = (measurements recorded per second) * (time between WiFi transmissions)
```

What follows is a brief discusion of how this project has been optimized to get the highest E value possible

### The old way

To begin with, the project was designed to send data as follows:

```
http://example:3000/rec/1222300,800,1222400,905, ...

rec - tells Meteor to record the data after it
1222300,800 - A data point. The first value is the time in milliseconds since
              the measurement was taken. The second value is the ADC value.
```

Depending on what the time was when the temperature was taken and the ADC value, the value with the trailing comma could take anywhere from four (ex. 0,0,) to sixteen (ex. 4294967295,1024,) characters. With common values, the efficiency, E, is very low, less than 1 on average.

More results [here](https://www.dropbox.com/s/4qgsr2xrkz4bo2e/EfficiencyDecimalWithComma.csv?dl=0).

The real problem with this method is that each measurement takes up so much space, giving us less measurements per transmissions. And since transmissions are so time expensive... We get low efficiency.

### A better way

So how can we make the data take up less space in a URL?

The solution I came up with was to encode all of the data into base 32. [Read more about base 32 encoding here.](http://en.wikipedia.org/wiki/Base32) Base 32 is great because all of the characters used are URL safe!

So, here's the same URL as shown above in base32 encoding:
```
http://example:3000/rec/159KS,PO,159O0,S9, ...
```

We just saved 6 characters for two measurements! Pretty slick. Notice that base 32 isn't really great to read as a human, but no worries, it will be encoded back into decimal on the Meteor server.

Now, depending on the data, our values take anywhere from four (ex. 0,0,) to eleven (ex. 3VVVVVV,VV,) characters. With common values the efficiency is quite a bit better, about 8 on average.

More results [here](https://www.dropbox.com/s/estrplf8mf1v6fn/EfficiencyBase32WithComma.csv?dl=0).

### Tweaking even further

Now, if we play our cards right, we can get rid of one of those commas. By mandating that the ADC value must always contain two characters, and that the ADC value will always be before the time value, we can be assured that the first two charcters in the reading are the ADC value, and the rest is the time of the reading.

Now our URL looks like this:
```
http://example:3000/rec/PO159KS,S9159O0, ...
```

That's a savings of one character per measurement.

Measurements can now be four (ex. 000,) to ten characters (ex. VVVVVVVV3,). And that might not sounds like a big deal, but when time is precious, it's worth it! The best efficiency at a common value is now around 9.5 on average.

More results [here](https://www.dropbox.com/s/wtiil403mxyiv3o/EfficiencyBase32NoComma.csv?dl=0).

That's quite a bit better than what we had before.

### Dealing with Arduino's Process library and `Process.run()`

If you checked out the CSV files above, you might have noticed something. The efficiency of the request was different depending on the length of the the request. Also, the request lengths that I tested stopped at 350 characters...

One of the biggest contributing factors to low efficiency in this project is the time it takes to send a cURL request to Meteor. Using the `Process.run()` method has a bit of a quirk to it, which is illustrated (roughly) below below:

| Request URL Length (chars) |Process Speed|Correctly Executed|
|----------------------------|-------------|------------------|
| 0 - 350                    | Pretty fast | Always           |
| 350 - 490                  | Really slow | Always           |
| 490 and higher             | Super fast  | Never            |

This appears to also be affected by the amount of RAM your sketch is using on your AVR; Less memory available, smaller window for a decent execution. This means also that your sketch's results may vary from these.

One might think that using `Process.runAsynchronously()` would improve performance, because we aren't waiting for a response. Here's what it'll actually do for you:

| Request URL Length (chars) |Process Speed|  Correctly Executed   |
|----------------------------|-------------|-----------------------|
| 0 - 300                    | Pretty fast | Almost Never          |
| 300 - 350                  | Pretty fast | Enough to be dangerous|
| 350 - 490                  | Really slow | Sometimes             |
| 490 and higher             | Super fast  | Never                 |

Once again, this is the case for this sketch. If you aren't running the cURL requests very closely together in time, your results will likely be better. Also, when I say the requests are executed correctly enough to be dangerous in the 300 to 350 range, I mean it. Everything might go great for a while, but once in a while you'll likely see requests that didn't make it through to Meteor.

So, because we want to squeeze in as much data per request, we need to choose the upper limit of the request length to get decently fast requests and consistently correct execution, and because we'd like to make sure that our data is getting where it needs to be, we will use `Process.run()`.

### Sending data over WiFi

The fact that this project is intended for WiFi is also a source of decreased efficiency. Depending on the strength of the WiFi signals for the Yún, or you might have issues with your connection such as slow transfer or disconnecting.

*Note: all optimization was performed with delay at 0 ms.*
