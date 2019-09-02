#include "Sixfab_CellularIoT.h"
#include <Ed25519.h>
#include <EEPROM.h>
#include <SHA3.h>

SixfabCellularIoT node;

char your_ip[] = "X.X.X.X"; // change with your ip
char your_port[] = "5000"; // change with your port

//STATES
const int SEND_DATA = 0;
const int COLLECT_DATA = 1;
const int RESET_ALL_DATA = 2;

int STATE;

//Wallet account
uint8_t walletPubKey[32] = {103, 39, 245, 29, 180, 20, 70, 224, 64, 38, 31, 91, 8, 141, 50, 148, 74, 224, 178, 225, 169, 244, 123, 236, 151, 62, 207, 117, 150, 236, 214, 154};
byte hashedPubKey[32];
uint32_t txCnt = 10;
uint64_t txFee = 2;
byte Header = 0;

//VARIABLES
uint8_t privateKey[32] = {129, 249, 46, 107, 251, 165, 231, 35, 72, 100, 82, 46, 42, 8, 2, 239, 96, 243, 143, 42, 228, 21, 248, 165, 178, 181, 180, 57, 34, 188, 223, 170};
uint8_t publicKey[32] = {162, 176, 158, 253, 164, 70, 217, 220, 79, 212, 142, 7, 19, 48, 87, 180, 171, 215, 55, 169, 24, 3, 239, 55, 116, 105, 90, 128, 200, 107, 254, 22};
uint8_t signature[64];

byte hash[32];
byte byteTxCnt[4];
byte byteTxFee[8];

int delayTime = 1000; //Delay in ms
bool retrieveKeypair = false;

//FLAGS
const uint8_t PUB_KEY = 70;
const uint8_t DATA = 83;
const uint8_t SIGNATURE = 84;

const int sizeData = 1000;
int counterData = 0;
uint8_t data[sizeData];              //signed data

const int sizeTx = sizeof(walletPubKey)+sizeof(publicKey)+sizeof(byteTxCnt)+sizeof(byteTxFee)+sizeof(Header)+sizeof(data);
      byte toSign[sizeTx];

// setup
void setup() {
   Serial.begin(115200);

  STATE = COLLECT_DATA;

  //Check if private Key is already stored, if not generate one
  if(retrieveKeypair){
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
  }

    SHA3_256* sha = new SHA3_256();

    sha->update(walletPubKey,sizeof(walletPubKey));
    sha->finalize(hashedPubKey,sizeof(hashedPubKey));

  //Start LTE module
  node.init();

  node.getIMEI();
  node.getFirmwareInfo();
  node.getHardwareInfo();

  node.setIPAddress(your_ip);
  node.setPort(your_port);

  //node.setGSMBand();
  node.setCATM1Band(LTE_CATM1_ANY);
  //node.setNBIoTBand(LTE_B20);
  //node.setCATM1Band(LTE_B5);
  //node.setNBIoTBand(LTE_B20);
  node.getBandConfiguration();
  node.setMode(AUTO_MODE);

  node.connectToOperator();
  node.getSignalQuality();
  node.getQueryNetworkInfo();
  node.deactivateContext();
  node.activateContext();
  node.closeConnection();
  node.startUDPService();

  Serial.print("Setup finished");
}

// loop
void loop() {
  delay(100);
    do_send();
}

void do_send() {
    switch(STATE){
        case COLLECT_DATA:
            collectData();
            break;
        case SEND_DATA:
            sendData();
            break;
        case RESET_ALL_DATA:
            resetAllData();
            break;
    }
}


void collectData(){
  data[counterData++] = getDataFromSensor();
    if(counterData>=sizeData){
        STATE = SEND_DATA;
     }
}

uint8_t* send_convert(uint8_t* str, int len) {
  // max size of the returned string is 2 * len + 1
  int final_len = 2 * len + 1;
  int i = 0, j = 0;

  uint8_t* vec = (uint8_t*) malloc(final_len);
  memset(vec, 0, final_len);

  for(i = 0; i < len; i++) {
    if(str[i] == 0) {
      vec[j] = 0x1;
      vec[j+1] = 0x1;
      j += 2;
    }
    else if(str[i] == 1) {
      vec[j] = 0x1;
      vec[j+1] = 0x2;
      j += 2;
    }
    else if(str[i] == 2) {
      vec[j] = 0x2;
      vec[j+1] = 0x2;
      j += 2;
    }
    else {
      vec[j] = str[i];
      j++;
    }
  }

  vec[j] = '\0';

  return vec;
}

void sendData(){
      SHA3_256* sha = new SHA3_256();
      byteTxCnt[0] = txCnt>>24&0xFF;
      byteTxCnt[1] = txCnt>>16&0xFF;
      byteTxCnt[2] = txCnt>>8&0xFF;
      byteTxCnt[3] = txCnt&0xFF;

      byteTxFee[0] = txFee>>56&0xFF;
      byteTxFee[1] = txFee>>48&0xFF;
      byteTxFee[2] = txFee>>40&0xFF;
      byteTxFee[3] = txFee>>32&0xFF;
      byteTxFee[4] = txFee>>24&0xFF;
      byteTxFee[5] = txFee>>16&0xFF;
      byteTxFee[6] = txFee>>8&0xFF;
      byteTxFee[7] = txFee>>0&0xFF;

      memset(toSign, 0, sizeof(toSign));
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

      uint8_t* to_send, *recv_conv, *recv;
      int xlen, recv_len;



      uint8_t sigTx[64+sizeof(toSign)];
      for(int k=0;k<sizeof(sigTx); k++){
        if(k<64){
          sigTx[k] = signature[k];
          }else if( k<(64+32)){
            sigTx[k] = walletPubKey[k-64];
            }
            else if( k<(64+32+32)){
            sigTx[k] = publicKey[k-64-32];
            }else {
              sigTx[k] = toSign[k-64];
              }
        }

    to_send = send_convert(sigTx, sizeof(sigTx));

    node.sendDataUDP(to_send);
    free(to_send);

    //TODO update only if transaction is successful
    txCnt = txCnt + 1;

    Serial.println("TRANSACTION SENT");
    STATE = RESET_ALL_DATA;
}


void resetAllData(){
    memset(data, 0, sizeof(data));
    memset(toSign, 0, sizeof(toSign));

    counterData = 0;
    STATE = COLLECT_DATA;
  }

uint8_t getDataFromSensor(){
    return random(100, 1000);
}