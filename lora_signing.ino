// MIT License
// https://github.com/gonzalocasas/arduino-uno-dragino-lorawan/blob/master/LICENSE
// Based on examples from https://github.com/matthijskooijman/arduino-lmic
// Copyright (c) 2015 Thomas Telkamp and Matthijs Kooijman


#include <lmic.h>
#include <hal/hal.h>
//#include <credentials.h>
#include "MQ135.h"
#include <Ed25519.h>

//VARIABLES
uint8_t privateKey[32];
uint8_t publicKey[32];
uint8_t signature[64];

//Configuration
uint8_t nrOfSplits = 8; //must be 2^n and max 64
uint8_t counterPayloads = 0; //indicates the current payload (piece of signature) to be sent
uint8_t nrOfBytes = sizeof(signature) / nrOfSplits;

//Boolean values to keep track of the current and next steps
boolean isPublicKeyReceived = false;
boolean isFirstPayload = true;
boolean isFirstPayloadReceived = false;
boolean isLastPayload = false;
boolean isLastPayloadReceived = true;

//Ackwnowledge payload to receive
uint8_t ackPayload = 0;

//indicates the number of different measurement to take, e.g CO, CO2 and turbidity -> 3
uint8_t nrOfAttributes = 3; 

float CO;
float CO2;
float turbidity;

//Configurations for TTN
static const u1_t NWKSKEY[16] = { 0x93, 0x22, 0x65, 0xB5, 0xC0, 0xD8, 0xE6, 0x47, 0x31, 0x69, 0xAE, 0xC8, 0x79, 0x80, 0x60, 0xDF };
static const u1_t APPSKEY[16] = { 0x03, 0xD9, 0x39, 0xB1, 0xFE, 0x24, 0xB0, 0x04, 0xE0, 0x06, 0x51, 0x4F, 0x09, 0x3B, 0xBF, 0x2D };
static const u4_t DEVADDR = 0x2601174C;

// These callbacks are only used in over-the-air activation, so they are
// left empty here (we cannot leave them out completely unless
// DISABLE_JOIN is set in config.h, otherwise the linker will complain).
void os_getArtEui (u1_t* buf) { }
void os_getDevEui (u1_t* buf) { }
void os_getDevKey (u1_t* buf) { }

static osjob_t sendjob;

// Schedule TX every this many seconds (might become longer due to duty
// cycle limitations).
const unsigned TX_INTERVAL = 10;

// Pin mapping Dragino Shield u
const lmic_pinmap lmic_pins = {
        .nss = 10,
        .rxtx = LMIC_UNUSED_PIN,
        .rst = 9,
        .dio = {2, 6, 7},
};
void onEvent (ev_t ev) {
    //ONLY DOWNLINK 
    if (ev == EV_TXCOMPLETE) {
        // Schedule next transmission
        if (LMIC.txrxFlags & TXRX_ACK)
            Serial.println(F("Received ack"));
        if (LMIC.dataLen) {
            Serial.print(F("Received "));
            Serial.print(LMIC.dataLen);
            Serial.println(F(" bytes of payload"));
            String aPayload ="";
            for (int i = 0; i < LMIC.dataLen; i++) {
                if (LMIC.frame[LMIC.dataBeg + i] < 0x10) {
                    //Serial.print(F("0"));
                }

                //FIND A BETTER WAY TO CAST THE DOWNLINK MESSAGES
                aPayload = aPayload +String(LMIC.frame[LMIC.dataBeg + i], HEX);
                //Serial.println(LMIC.frame[LMIC.dataBeg + i], HEX);


            }
            ackPayload = (uint8_t)(aPayload.toInt());
            Serial.print("\nAck Payloads: ");Serial.println(ackPayload);

            //Check whether the first payload (the only one signed so far) is received by the gateway
            if(isFirstPayload && isPublicKeyReceived && nrOfSplits == ackPayload){
                Serial.print("First payload was received: ");Serial.println(ackPayload);
                isFirstPayload = false;
                isFirstPayloadReceived = true;
            }

            //Check if the last payload is received, so that a new packet can be signed and a new signature can be generated
            if(!isFirstPayload && isPublicKeyReceived && isLastPayload && nrOfSplits == ackPayload){
                Serial.print("Last payload was received: ");Serial.println(ackPayload);
                counterPayloads = 0;
                isLastPayload = false;
                isLastPayloadReceived = true;
                isFirstPayload = true;
                isFirstPayloadReceived = false;
            }

            //Set default to 9 in ttn as well, this indicated that the public key was received by the gateway
            if(ackPayload == 9){
                Serial.println("PubliKey was received by the gateway");
                isPublicKeyReceived = true;
            }

            //Check whether the right payload was received
            if(counterPayloads == ackPayload && !isFirstPayload && !isLastPayload){
                Serial.print("Payload number was received: ");Serial.println(ackPayload);
                counterPayloads++;
            }
        }
        os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(TX_INTERVAL), do_send);
    } else {
        //Serial.println(ev);
    }
}


void do_send(osjob_t* j) {
    // Payload to send (uplink), so far only mock data are used and not data directly from real sensors
    int16_t COval = (int16_t)11;
    int16_t CO2val = (int16_t)12;
    int16_t turbidityval = (int16_t)13;
    int16_t signature_0 = (int16_t)0;
    int16_t signature_1 = (int16_t)1;

    //If the public key is not received, send it
    if(!isPublicKeyReceived){
        if (LMIC.opmode & OP_TXRXPEND) {
            Serial.println(F("OP_TXRXPEND, not sending"));
        } else {
            isPublicKeyReceived = false;
            // Prepare upstream data transmission at the next possible time.
            LMIC_setTxData2(1, publicKey, sizeof(publicKey)-1, 0);
            Serial.println(F("Sending uplink packet publicKey..."));
        }
    }

    //Sign the first data and generate the signature. The public key HAS to be received by the gateway
    //This payload contains contains how many packet have to be received in order to get the whole signature and to signalize it as the first packet
    //the signature is set to 0
    else if(isFirstPayload && isPublicKeyReceived && !isFirstPayloadReceived && !isLastPayload && isLastPayloadReceived){

        byte data[nrOfAttributes*2+5];
        data[0] = CO2val>>8;
        data[1] = CO2val & 0xFF;
        data[2] = COval>>8;
        data[3] = COval & 0xFF;
        data[4] = turbidityval>>8;
        data[5] = turbidityval & 0xFF;
        data[6] = nrOfSplits >>8;         //signalize how many packet are going to be received
        data[7] = nrOfSplits & 0xFF;
        data[8] = signature_0 >>8;        //--> set to 0
        data[9] = signature_0 & 0xFF;  

        Ed25519::sign(signature, privateKey, publicKey, data, sizeof(data) );

        //Serial.println("SIZE OF DATA:_______"); Serial.print(sizeof(data));
        if (LMIC.opmode & OP_TXRXPEND) {
            Serial.println(F("OP_TXRXPEND, not sending"));
        } else {
            isFirstPayloadReceived = false;
            // Prepare upstream data transmission at the next possible time.
            LMIC_setTxData2(1, data, sizeof(data)-1, 0);
            Serial.print(F("Sending uplink packet..."));Serial.println("FIRST PAYLOAD");
        }

    //Start sending the NON signed data containing a piece of the signature
    }else if(isPublicKeyReceived && !isFirstPayload && counterPayloads < nrOfSplits && isFirstPayloadReceived && isLastPayloadReceived && !isLastPayload){
      
        //Payload example
        //{
        //CO: 26,
        //CO2: 14,
        //turbidity: 10,
        //ph: 8,
        //c: counterPayloads --> indicates the current counter of the payload
        //s: signature[nrOfBytes*counterPayloads : nrOfBytes*counterPayloads + nrOfBytes-1] the first 8bytes of the signature --> 64/nrOfSplits -> 64/8 = 8
        //}
        byte data[nrOfAttributes*2+2+nrOfBytes*2+1];
        data[0] = CO2val>>8;
        data[1] = CO2val & 0xFF;
        data[2] = COval>>8;
        data[3] = COval & 0xFF;
        data[4] = turbidityval>>8;
        data[5] = turbidityval & 0xFF;
        data[6] = counterPayloads >>8;
        data[7] = counterPayloads & 0xFF;
        int n = counterPayloads*nrOfSplits;
        for(int i=0; i< nrOfBytes*2+2;i+=2 ){
            data[nrOfAttributes*2+2+i] = signature[n] >>8;
            data[nrOfAttributes*2+2+i+1] = signature[n] & 0xFF;
            n++;
        }

        if (LMIC.opmode & OP_TXRXPEND) {
            Serial.println(F("OP_TXRXPEND, not sending"));
        } else {
            // Prepare upstream data transmission at the next possible time.
            LMIC_setTxData2(1, data, sizeof(data)-1, 0);
            Serial.print(F("Sending uplink packet..."));Serial.println(counterPayloads);
        }

    //Send the last payload to indicate that no more packets containing the signature are expected, this is signified by setting the signature to 1
    }else if(isPublicKeyReceived && !isFirstPayload && isFirstPayloadReceived && counterPayloads == nrOfSplits){
        isLastPayload = true;
        Serial.println("2 - Last payload...");
        Serial.println("2 - Staring again with first payload...");
        byte data[nrOfAttributes*2+5];
        data[0] = CO2val>>8;
        data[1] = CO2val & 0xFF;
        data[2] = COval>>8;
        data[3] = COval & 0xFF;
        data[4] = turbidityval>>8;
        data[5] = turbidityval & 0xFF;
        data[6] = counterPayloads >>8;
        data[7] = counterPayloads & 0xFF;
        data[8] = signature_1 >> 8;                //--> set to 1
        data[9] = signature_1 & 0xFF;

        //last timestamp sent
        //Payload example
        //{
        //CO: 25,
        //CO2: 13,
        //turbidity: 11,
        //ph: 6,
        //c: nrOfSplits
        //s: 00
        //}
        if (LMIC.opmode & OP_TXRXPEND) {
            Serial.println(F("OP_TXRXPEND, not sending"));
        } else {
            // Prepare upstream data transmission at the next possible time.
            LMIC_setTxData2(1, data, sizeof(data)-1, 0);
            Serial.println(F("Sending uplink packet..."));
        }
    }else{
      Serial.println("Unexpected condition");
      Serial.print("counterPayloads -->" );Serial.println(counterPayloads);
      }




}

void setup() {
    Serial.begin(115200);
    Serial.println(F("Starting..."));

    //Generate a private key and derive a public one, this is done EVERY time at start up
    Ed25519::generatePrivateKey(privateKey);
    Ed25519::derivePublicKey(publicKey, privateKey);

    // LMIC init
    os_init();

    // Reset the MAC state. Session and pending data transfers will be discarded.
    LMIC_reset();

    // Set static session parameters.
    LMIC_setSession (0x1, DEVADDR, NWKSKEY, APPSKEY);

    // Disable link check validation
    LMIC_setLinkCheckMode(0);

    // TTN uses SF9 for its RX2 window.
    LMIC.dn2Dr = DR_SF9;

    // Set data rate and transmit power for uplink (note: txpow seems to be ignored by the library)
    LMIC_setDrTxpow(DR_SF7, 14);

    // Start job
    do_send(&sendjob);
}

void loop() {

    os_runloop_once();
}
