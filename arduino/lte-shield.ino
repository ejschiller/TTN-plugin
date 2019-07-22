#include "Sixfab_CellularIoT.h"
#include <Ed25519.h>
#include <EEPROM.h>
#include <SHA3.h>

SixfabCellularIoT node;

char your_ip[] = "178.83.209.41"; // change with your ip
char your_port[] = "5000"; // change with your port

//STATES
const int SEND_PING = 0;
const int SIGN_TRANSACTION = 1;
const int SEND_DATA = 2;
const int SEND_SIGNATURE = 3;
const int COLLECT_DATA = 4;
const int RESET_ALL_DATA = 5;
const int SEND_TRANSACTION = 6;

int STATE;

//Wallet account
uint8_t walletPubKey[32] = {103, 39, 245, 29, 180, 20, 70, 224, 64, 38, 31, 91, 8, 141, 50, 148, 74, 224, 178, 225, 169, 244, 123, 236, 151, 62, 207, 117, 150, 236, 214, 154};
byte hashedPubKey[32];
uint32_t txCnt = 3;
uint64_t txFee = 1;
byte Header = 0;

//VARIABLES
 uint8_t privateKey[32] = {129, 249, 46, 107, 251, 165, 231, 35, 72, 100, 82, 46, 42, 8, 2, 239, 96, 243, 143, 42, 228, 21, 248, 165, 178, 181, 180, 57, 34, 188, 223, 170};
uint8_t publicKey[32] = {162, 176, 158, 253, 164, 70, 217, 220, 79, 212, 142, 7, 19, 48, 87, 180, 171, 215, 55, 169, 24, 3, 239, 55, 116, 105, 90, 128, 200, 107, 254, 22};
uint8_t signature[64];
int delayTime = 1000; //Delay in ms

//FLAGS
const uint8_t PUB_KEY = 70;
const uint8_t DATA = 83;
const uint8_t SIGNATURE = 84;

const int sizeData = 20;
int counterData = 0;
uint8_t data[sizeData];              //signed data
    char wP[2000];
char prova[5];
//Do not modify
//byte byteTxCnt[] = {(txCnt>>24)&0xFF,(txCnt>>16)&0xFF,(txCnt>>8)&0xFF,(txCnt)&0xFF};
//byte byteTxFee[] = {(txFee>>56)&0xFF,(txFee>>48)&0xFF,(txFee>>40)&0xFF,(txFee>>32)&0xFF,(txFee>>24)&0xFF,(txFee>>16)&0xFF,(txFee>>8)&0xFF,(txFee)&0xFF};
char transaction[32] = {};
//ACK TODO
char pubKey[64];

// setup
void setup() {
   Serial.begin(115200);
  STATE = SEND_PING;
  //Check if private Key is already stored, if not generate one
  if(false){
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
  Serial.println("FIRMWARE INFO");
  //node.getFirmwareInfo();
  node.deactivateContext();
  node.activateContext();
  node.closeConnection();
  node.startUDPService();
  //node.sendDataUDP("Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!");

  //node.connectToServerTCP();
  //node.sendDataTCP("Hello World!\r\n");
    //node.sendDataRest(walletPubKey, sizeof(walletPubKey));

  Serial.print("Setup finished");
}

// loop
void loop() {
    //node.sendDataUDP("Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!Hello World!");

  //delay(delayTime);
  //sendATComm("AT+CIPStart=0,\"UDP\",\"213.55.171.139\",5000,5000,2","OK\r\n");
  //node.startUDPService();
    //node.listenToUDP();

  //node.startUDPService();
  //node.sendDataUDP("a");
  //char response[100];
  //node.listenToUDP(*response);
   //Serial.print("RESPONSE");
   //Serial.print(sizeof(response));
   //Serial.print(response);
   //for(int i=0;i<sizeof(response);i++){
    //Serial.print(response[i]);
    //}
    do_send();
}

void do_send() {
    switch(STATE){
        case SEND_PING:
            Serial.println("SEND PING");
            sendPing();
            break;
        case COLLECT_DATA:
            //Serial.println("COLLECT DATA");
            collectData();
            break;
        case SIGN_TRANSACTION:
            Serial.println("SIGN_TRANSACTION");
            signTranasaction();
            break;
        case SEND_DATA:
            Serial.println("SEND DATA");
            sendData();
            break;
        case SEND_SIGNATURE:
            Serial.println("SEND SIGNATURE");
            sendSignature();
            break;

        case SEND_TRANSACTION:
            Serial.println("SEND TRANSACTION");
            sendTransaction();
            break;
        case RESET_ALL_DATA:
            Serial.println("RESET ALL DATA");
            resetAllData();
            break;
    }
}

void sendPing(){
    strcat(wP, "{\"Pk\":");

  for(int i=0;i<sizeof(publicKey);i++){
    //char prova[5];
    if(i==0){
          sprintf(prova, "[%d,", publicKey[i]);

    }else if(i==sizeof(walletPubKey)-1){
          sprintf(prova, "%d]}", publicKey[i]);

    }else {
          sprintf(prova, "%d,", publicKey[i]);
    }
    strcat(wP, prova);
    // for(int j=0;j<sizeof(prova);j++){
    //   wP[k++]=prova[j];
    // }
  }
  //node.sendDataUDP(walletPubKey);
  //node.sendDataUDP(wP);
  memset(wP, 0, 600);
      memset(prova, 0, 5);

  //node.sendDataRest(walletPubKey, sizeof(walletPubKey));
    //node.listenToUDP();
    Serial.println("Delay after sending pubKey");
    //delay(1000);
        Serial.println("Aftet DELAY");
    STATE = COLLECT_DATA;
}

void collectData(){
  Serial.println("COLLECT DATA");
  //char value[5];
  //uint8_t asd = getDataFromSensor();
  //sprintf(value, "%d", asd);
  //strcat(data, value);
  data[counterData++] = getDataFromSensor();

        //data[counterData++]
    if(counterData>=sizeData){
        STATE = SIGN_TRANSACTION;
     }
}

void signTranasaction(){
      //TODO SIGN THE COMPLETE TRANSACTION
      byte hash[32];

      byte byteTxCnt[] = {(txCnt>>24)&0xFF,(txCnt>>16)&0xFF,(txCnt>>8)&0xFF,(txCnt)&0xFF};
      byte byteTxFee[] = {(txFee>>56)&0xFF,(txFee>>48)&0xFF,(txFee>>40)&0xFF,(txFee>>32)&0xFF,(txFee>>24)&0xFF,(txFee>>16)&0xFF,(txFee>>8)&0xFF,(txFee)&0xFF};

      SHA3_256* sha = new SHA3_256();
      int sizeTx = sizeof(walletPubKey)+sizeof(publicKey)+sizeof(byteTxCnt)+sizeof(byteTxFee)+sizeof(Header)+sizeof(data);
      byte toSign[sizeTx];
      memset(wP, 0, 2000);
      memset(prova, 0, 5);
      strcat(wP,"{");
      sha->update(walletPubKey,sizeof(walletPubKey));
      sha->finalize(hash,sizeof(hash));

      int start = 0;
      strcat(wP,"\"WalletPubKey\":");
      for (int i = start; i < sizeof(hash); i++ ){
        toSign[i] = hash[i];
                if(i == start){
                      sprintf(prova, "[%d,", walletPubKey[i]);

                }else if( i == sizeof(hash)-1){
                      sprintf(prova, "%d],", walletPubKey[i]);

                }else {
                      sprintf(prova, "%d,", walletPubKey[i]);
                }
                strcat(wP, prova);
                memset(prova, 0, 5);
      }


      sha->reset();
      sha->update(publicKey,sizeof(publicKey));
      sha->finalize(hash,sizeof(hash));
      strcat(wP,"\"PublicKey\":");
      start = sizeof(hash);
      for (int i = start; i < start + sizeof(hash); i++ ){
        toSign[i] = hash[i-start];
                 if(i == start){
                      sprintf(prova, "[%d,", publicKey[i-start]);

                }else if( i == start + sizeof(hash)-1){
                      sprintf(prova, "%d],", publicKey[i-start]);

                }else {
                      sprintf(prova, "%d,", publicKey[i-start]);
                }
                strcat(wP, prova);
                memset(prova, 0, 5);
      }

      sha->reset();
       strcat(wP,"\"TxCnt\":");

      start = start + sizeof(hash);
      for (int i = start; i < start + sizeof(byteTxCnt); i++ ){
        toSign[i] = byteTxCnt[i-start];
        if(i == start){
                      sprintf(prova, "[%d,", byteTxCnt[i-start]);

                }else if( i == start + sizeof(byteTxCnt)-1){
                      sprintf(prova, "%d],", byteTxCnt[i-start]);

                }else {
                      sprintf(prova, "%d,", byteTxCnt[i-start]);
                }
                strcat(wP, prova);
                memset(prova, 0, 5);
      }
         strcat(wP,"\"TxFee\":");

      start = start + sizeof(byteTxCnt);
      for (int i = start; i < start + sizeof(byteTxFee); i++ ){
        toSign[i] = byteTxFee[i-start];
                if(i == start){
                      sprintf(prova, "[%d,", byteTxFee[i-start]);

                }else if( i == start + sizeof(byteTxFee)-1){
                      sprintf(prova, "%d],", byteTxFee[i-start]);

                }else {
                      sprintf(prova, "%d,", byteTxFee[i-start]);
                }
                strcat(wP, prova);
                memset(prova, 0, 5);
      }
           strcat(wP,"\"Header\":");

      start = start + sizeof(byteTxFee);
      for (int i = start; i < start+sizeof(Header); i++ ){
        toSign[i] = Header;
                      sprintf(prova, "[%d],", Header);
                strcat(wP, prova);
                memset(prova, 0, 5);
      }
           strcat(wP,"\"Data\":");

      start = start + 1;
      for (int i = start; i < start +sizeof(data); i++ ){
        toSign[i] = data[i-start];
                        if(i == start){
                      sprintf(prova, "[%d,", data[i-start]);

                }else if( i == start + sizeof(data)-1){
                      sprintf(prova, "%d],", data[i-start]);

                }else {
                      sprintf(prova, "%d,", data[i-start]);
                }
                strcat(wP, prova);
                memset(prova, 0, 5);
      }

     sha->update(toSign,sizeof(toSign));
     sha->finalize(hash,sizeof(hash));




    Ed25519::sign(signature, privateKey, publicKey, hash, sizeof(hash));
               strcat(wP,"\"Signature\":");

    for(int k =0; k<sizeof(signature);k++){
       if(k == 0){
                      sprintf(prova, "[%d,", signature[k]);

                }else if( k == sizeof(signature)-1){
                      sprintf(prova, "%d]}", signature[k]);

                }else {
                      sprintf(prova, "%d,", signature[k]);
                }
                strcat(wP, prova);
                memset(prova, 0, 5);
      }
    Serial.println("TRANSACTION SIGNED");
    //node.sendDataUDP(walletPubKey);
    Serial.println("TO SIGN BUFFER");
    for(int z = 0; z<sizeof(toSign);z++){
      Serial.print(toSign[z]);Serial.print(" ");
      }
          node.sendDataUDP(wP);
              Serial.println("TRANSACTION SENDDDDDDDDDDDDDDD");
    //TODO update only if transaction is successfull
    txCnt = txCnt + 1;



    memset(wP, 0, 2000);
      memset(prova, 0, 5);
      //node.sendDataUDP(wP);
      //Serial.println("SENT ASDHADAS");
      //delay(3000);
      STATE = SEND_PING;
  }

void sendTransaction(){
      //TODO SEND THE COMPLETE TRANSACTION
      //delay(1000);
            //Serial.print("Size of transaction");Serial.println(sizeof(transaction));

      //node.sendDataUDP(data);

      STATE = RESET_ALL_DATA;
  }

void sendData(){
      //Serial.print("Size of data");Serial.println(sizeof(data));
      //  node.closeConnection();
//  node.startUDPService();
   //   node.sendDataUDP(char(data));
  //    Serial.println("Delay after sending data");
  //    delay(3000);

      STATE = SEND_SIGNATURE;
  }

void sendSignature(){
 //   node.closeConnection();
//  node.startUDPService();
  memset(wP, 0, 600);
      memset(prova, 0, 5);
for(int i=0;i<sizeof(signature);i++){
    //char prova[5];
    if(i==0){
          sprintf(prova, "[%d,", signature[i]);

    }else if(i==sizeof(signature)-1){
          sprintf(prova, "%d]", signature[i]);

    }else {
          sprintf(prova, "%d,", signature[i]);
    }
    strcat(wP, prova);
    // for(int j=0;j<sizeof(prova);j++){
    //   wP[k++]=prova[j];
    // }
  }
  //node.sendDataUDP(walletPubKey);
    strcat(wP, "sig");

  node.sendDataUDP(wP);
  memset(wP, 0, 600);
      memset(prova, 0, 5);
        //node.sendDataUDP(signature);
        Serial.println("Delay after sending signature");
        //delay(2000);

        STATE = RESET_ALL_DATA;
  }

void resetAllData(){
  //TODO RESET ALL DATA FOR COLLECT
    memset(data, 0, sizeof(data));
    memset(transaction, 0, sizeof(transaction));

    counterData = 0;
    //delay(1000);


      STATE = COLLECT_DATA;
  }

uint8_t getDataFromSensor(){
    return random(100, 1000);
}