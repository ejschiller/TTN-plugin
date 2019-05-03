// MIT License
// https://github.com/gonzalocasas/arduino-uno-dragino-lorawan/blob/master/LICENSE
// Based on examples from https://github.com/matthijskooijman/arduino-lmic
// Copyright (c) 2015 Thomas Telkamp and Matthijs Kooijman


#include <lmic.h>
#include <hal/hal.h>
//#include <credentials.h>
#include "MQ135.h"
#include <Ed25519.h>
#include <EEPROM.h>
#include <SHA3.h>
 

//STATES
const int SEND_PUBKEY = 0;
const int SEND_DATA = 1;
const int SIGN_DATA = 2;
const int COLLECT_DATA = 3;
const int RESET_ALL_DATA = 4;
const int RESET_DATA_TO_SEND = 5;
const int SEND_SIGNATURE = 8;
const int SEND_SIGN_2 = 9;



int STATE;

//Wallet account
uint8_t walletPubKey[32] = {103, 39, 245, 29, 180, 20, 70, 224, 64, 38, 31, 91, 8, 141, 50, 148, 74, 224, 178, 225, 169, 244, 123, 236, 151, 62, 207, 117, 150, 236, 214, 154};
uint32_t txCnt = 0;
uint64_t txFee = 1;
byte Header = 0;

//VARIABLES
uint8_t privateKey[32];
uint8_t publicKey[32];
uint8_t signature[64];

uint16_t counterValues=0;                //Counter for total value that are going to be signed
uint8_t counterValuesToSend=0;          //Counter for values that are going to be sent each time
uint8_t counterPayloads = 0;

const uint8_t packets = 10;
const uint8_t maxByteToSend = 10;       //Max values that are going to be sent eacht time
const int sizeDataSigned = maxByteToSend*packets; //At best it would be a multiple of 51, max size of data signed
byte data[sizeDataSigned];              //singed data
byte toSend[maxByteToSend+2];             //data sent each time

//Ackwnowledge payload to receive
uint8_t expectedAck = 0;

//FLAGS
const uint8_t PUB_KEY = 80;
const uint8_t SIGN_1 = 81;
const uint8_t SIGN_2 = 82;

int rnd = 0;


//Configurations for TTN
static const u1_t NWKSKEY[16] = { 0x74, 0x60, 0xED, 0x9E, 0xF1, 0x94, 0x8C, 0xFB, 0x4D, 0xB4, 0x89, 0xF0, 0xF2, 0x90, 0x6C, 0x01 };
static const u1_t APPSKEY[16] = { 0x5B, 0xB3, 0x2F, 0xD3, 0xA3, 0x6D, 0xA5, 0x54, 0x2A, 0x45, 0x32, 0x62, 0xA1, 0xC5, 0xED, 0x7F };
static const u4_t DEVADDR = 0x26011F23;

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

void sendPublicKey(){
    uint8_t publicKeyTmp[34];
    memcpy(publicKeyTmp, publicKey, 32);
    publicKeyTmp[32] = PUB_KEY>>8;
    publicKeyTmp[33] = PUB_KEY & 0xFF;

    if (LMIC.opmode & OP_TXRXPEND) {
        Serial.println(F("OP_TXRXPEND, not sending"));
    } else {
        // Prepare upstream data transmission at the next possible time.
        LMIC_setTxData2(1, publicKeyTmp, sizeof(publicKeyTmp), 0);
    }
    os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(TX_INTERVAL), do_send);
}

void collectData(){
    uint8_t value = getDataFromSensor();

    if(counterValuesToSend < maxByteToSend && counterValues < sizeDataSigned){
        data[counterValues++] = value>>8;
        data[counterValues++] = value & 0xFF;

        toSend[counterValuesToSend++] = value>>8;
        toSend[counterValuesToSend++] = value & 0xFF;
    }

    if(counterValuesToSend == maxByteToSend) {
        STATE = SEND_DATA;
        Serial.print("counterPayloads: ");Serial.println(counterPayloads);
        toSend[counterValuesToSend] = counterPayloads>>8;
        toSend[counterValuesToSend+1] = counterPayloads & 0xFF;
        
        os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(0), do_send);
    }else{
          os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(0), do_send);
      }

}

void sendData(){
    if (LMIC.opmode & OP_TXRXPEND) {
        Serial.println(F("OP_TXRXPEND, not sending"));
    } else {
        // Prepare upstream data transmission at the next possible time.
        Serial.println("SENDING");
        LMIC_setTxData2(1, toSend, sizeof(toSend), 0);
    }
    os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(TX_INTERVAL), do_send);
}
  
void signData(){
      byte hash[32];
      byte byteTxCnt[] = {(txCnt>>24)&0xFF,(txCnt>>16)&0xFF,(txCnt>>8)&0xFF,(txCnt)&0xFF};
      byte byteTxFee[] = {(txFee>>56)&0xFF,(txFee>>48)&0xFF,(txFee>>40)&0xFF,(txFee>>32)&0xFF,(txFee>>24)&0xFF,(txFee>>16)&0xFF,(txFee>>8)&0xFF,(txFee)&0xFF};
    
      SHA3_256* sha = new SHA3_256();
      int sizeTx = sizeof(walletPubKey)+sizeof(publicKey)+sizeof(byteTxCnt)+sizeof(byteTxFee)+sizeof(Header)+sizeof(data);
      byte toSign[sizeTx];

      sha->update(walletPubKey,sizeof(walletPubKey));
      sha->finalize(hash,sizeof(hash));

      int start = 0;
      for (int i = start; i < sizeof(hash); i++ ){
        toSign[i] = hash[i];
      }
      
      sha->reset();
      sha->update(publicKey,sizeof(publicKey));
      sha->finalize(hash,sizeof(hash));
           
      start = sizeof(hash);
      for (int i = start; i < start + sizeof(hash); i++ ){
        toSign[i] = hash[i-start];
      }
      
      sha->reset();
      
      start = start + sizeof(hash);
      for (int i = start; i < start + sizeof(byteTxCnt); i++ ){
        toSign[i] = byteTxCnt[i-start];
      }
  
      start = start + sizeof(byteTxCnt);
      for (int i = start; i < start + sizeof(byteTxFee); i++ ){
        toSign[i] = byteTxFee[i-start];
      }
  
      start = start + sizeof(byteTxFee);
      for (int i = start; i < start+sizeof(Header); i++ ){
        toSign[i] = Header;
      }
  
      start = start + 1;
      for (int i = start; i < start +sizeof(data); i++ ){
        toSign[i] = data[i-start];
      } 
 
     sha->update(toSign,sizeof(toSign));
     sha->finalize(hash,sizeof(hash)); 
    
    
    
    
    Ed25519::sign(signature, privateKey, publicKey, hash, sizeof(hash));
   

    STATE = SEND_SIGNATURE;
    os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(0), do_send);

}

void sendSignature(){
   uint8_t signatureTmp[34];

  if(STATE == SEND_SIGNATURE){
    for (int i = 0; i < 32; ++i ){
            signatureTmp[i] = signature[i];
          }
    signatureTmp[32] = SIGN_1>>8;
    signatureTmp[33] = SIGN_1 & 0xFF;
    }
  else if(STATE == SEND_SIGN_2){
      for (int i = 32; i < 64; ++i ){
        signatureTmp[i-32] = signature[i];
      }
      signatureTmp[32] = SIGN_2>>8;
      signatureTmp[33] = SIGN_2 & 0xFF;
    }
    if (LMIC.opmode & OP_TXRXPEND) {
        Serial.println(F("OP_TXRXPEND, not sending"));
    } else {
        // Prepare upstream data transmission at the next possible time.
        LMIC_setTxData2(1, signatureTmp, sizeof(signatureTmp), 0);
    }
    os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(TX_INTERVAL), do_send);
}

void resetDataToSend(){
    memset(toSend, 0, sizeof(toSend));
    counterValuesToSend = 0;
    STATE = COLLECT_DATA;
    os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(0), do_send);

}

void resetAllData(){
    memset(toSend, 0, sizeof(toSend));
    counterValuesToSend = 0;
    memset(data, 0, sizeof(data));
    counterValues = 0;
    counterPayloads = 0;

    STATE = SEND_PUBKEY;

    os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(0), do_send);

}

void do_send(osjob_t* j) {

    switch(STATE){
        case SEND_PUBKEY:
            Serial.println("SEND PUBLIC KEY");
            sendPublicKey();
            break;
        case SEND_DATA:
            Serial.println("SEND DATA");
            sendData();
            break;
        case SIGN_DATA:
            Serial.println("SIGN DATA");
            signData();
            break;
        case COLLECT_DATA:
            Serial.println("COLLECT DATA");
            collectData();
            break;
        case SEND_SIGNATURE:
            Serial.println("SEND SIGNATURE");
            sendSignature();
            break;
        case SEND_SIGN_2:
            Serial.println("SEND SIGNATURE 2");
            sendSignature();
            break;
        case RESET_DATA_TO_SEND:
            Serial.println("RESET DATA TO SEND");
            resetDataToSend();
            break;
        case RESET_ALL_DATA:
            Serial.println("RESET ALL DATA");
            resetAllData();
            break;
    }
    //os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(1), do_send);

}

void onEvent (ev_t ev) {
    //ONLY DOWNLINK
    if (ev == EV_TXCOMPLETE) {
        // Schedule next transmission
        if (LMIC.txrxFlags & TXRX_ACK) {
            Serial.println(F("Received ack"));
        }
        if( ( LMIC.txrxFlags & ( TXRX_DNW1 | TXRX_DNW2 ) ) != 0 )
      {
        //Serial.println("Received something");
      }
        if (LMIC.dataLen) {
            Serial.print(F("Received "));
            Serial.print(LMIC.dataLen);
            Serial.println(F(" bytes of payload"));
            String aPayload =String(LMIC.frame[LMIC.dataBeg]);
            //for (int i = 0; i < LMIC.dataLen; i++) {
                //FIND A BETTER WAY TO CAST THE DOWNLINK MESSAGES
                //Serial.println(LMIC.frame[LMIC.dataBeg + i]);
                //aPayload = aPayload + String(LMIC.frame[LMIC.dataBeg + i]);
                //Serial.println(LMIC.frame[LMIC.dataBeg + i], HEX);
            //}
            Serial.println(aPayload);
            expectedAck = (uint8_t)(aPayload.toInt());
            Serial.print("\nAck Payloads: ");Serial.println(expectedAck);

            //Check the ACK and set the next STATE accordingly
            if(SEND_PUBKEY == STATE && expectedAck == PUB_KEY){
                Serial.println("PubKey received, next state COLLECT_DATA");
                STATE = COLLECT_DATA;

            }else if(STATE == SEND_DATA && expectedAck == counterPayloads){
                Serial.print("Data received and ");

                counterPayloads++;
                if(counterValues < sizeDataSigned) {
                    Serial.println("RESET ONLY DATA TO BE SEND");
                    STATE = RESET_DATA_TO_SEND;
                }else if (counterValues == sizeDataSigned){
                    Serial.println("SIGN DATA");
                    STATE = SIGN_DATA;
                }else {
                    Serial.println("UNKNOWN STATE ");Serial.print(STATE);
                }
                Serial.print("Size of counter values: ");Serial.println(counterValues);
                Serial.print("Size of size data signed: ");Serial.println(sizeDataSigned);

            }else if(STATE == SEND_SIGNATURE && expectedAck == SIGN_1){
                Serial.println("SIGN_1 received, next state SIGN_2");
                STATE = SEND_SIGN_2;
            }

            
            else if(STATE == SEND_SIGN_2 && expectedAck == SIGN_2){
                Serial.println("Signature received, next state RESET_ALL_DATA");
                //txCnt = txCnt+1;
                STATE = RESET_ALL_DATA;
            }
        }
        os_setTimedCallback(&sendjob, os_getTime()+sec2osticks(TX_INTERVAL), do_send);
    } else {
        //Serial.println(ev);
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println(F("Starting..."));
    rnd = EEPROM.read ( 40 );
    EEPROM.write ( 40, rnd+1);
            while(false){
          unsigned long StartTime = millis();
        Ed25519::generatePrivateKey(privateKey);
              Ed25519::derivePublicKey(publicKey, privateKey);

          unsigned long CurrentTime = millis();
          unsigned long ElapsedTime = CurrentTime - StartTime;  
          Serial.print("Elapsedtime ");Serial.println(ElapsedTime);
      }
    
    STATE = SEND_PUBKEY;
    //Check if private Key is already stored, if not generate one
    if(EEPROM.read ( 0 )==0 && EEPROM.read ( 1 ) == 0 ){
        Serial.println("NO PRIVATE KEY FOUND, GENERATING ONE...");
        Ed25519::generatePrivateKey(privateKey);
        for ( int i = 0; i < 32; ++i ){
          EEPROM.write ( i, privateKey [ i ] );
        }
     }else{
        Serial.println("PRIVATE KEY FOUND");
          for (int i = 0; i < 32; ++i ){
            privateKey[i] = EEPROM.read ( i );
          }
      }

      //Derive the public key from the private key
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
    //LMIC_setClockError(MAX_CLOCK_ERROR * 500 / 100);


    // Set data rate and transmit power for uplink (note: txpow seems to be ignored by the library)
    LMIC_setDrTxpow(DR_SF7, 24);
    // Start job
    do_send(&sendjob);
}

uint8_t getDataFromSensor(){
    return random(100, 1000)+rnd;
}

void loop() {
    os_runloop_once();
}
