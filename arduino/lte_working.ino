#include "Sixfab_CellularIoT.h"
#include <Ed25519.h>
#include <EEPROM.h>
#include <SHA3.h>

SixfabCellularIoT node;

char your_ip[] = "213.55.171.139"; // change with your ip
//char your_ip[] = "178.83.209.41";
//char your_ip[] = "130.92.70.177";

//char your_ip[] = "130.92.70.177";
char your_port[] = "5001"; // change with your port

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
unsigned char walletPubKey[32] = {103, 39, 245, 29, 180, 20, 70, 224, 64, 38, 31, 91, 8, 141, 50, 148, 74, 224, 178, 225, 169, 244, 123, 236, 151, 62, 207, 117, 150, 236, 214, 154};
byte hashedPubKey[32];
uint32_t txCnt = 3;
uint64_t txFee = 1;
byte Header = 0;

//VARIABLES
uint8_t privateKey[32] = {129, 249, 46, 107, 251, 165, 231, 35, 72, 100, 82, 46, 42, 8, 2, 239, 96, 243, 143, 42, 228, 21, 248, 165, 178, 181, 180, 57, 34, 188, 223, 170};
unsigned char publicKey[32] = {162, 176, 158, 253, 164, 70, 217, 220, 79, 212, 142, 7, 19, 48, 87, 180, 171, 215, 55, 169, 24, 3, 239, 55, 116, 105, 90, 128, 200, 107, 254, 22};
uint8_t signature[64];
int delayTime = 1000; //Delay in ms

const boolean generateNewKeypair = false;

//FLAGS
const uint8_t PUB_KEY = 70;
const uint8_t DATA = 83;
const uint8_t SIGNATURE = 84;

const int sizeData = 2;
int counterData = 0;
uint8_t data[sizeData];              //signed data
char request[2000];
char tmpChar[5];
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
  if(generateNewKeypair){
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
  //node.changeBaudRate();
  //node.sendDataUDP("Hello World!");
}

// loop
void loop() {
  //node.sendDataUDP("HELLO WORLD");
  //node.listenToUDP();

      //node.sendDataUDP("HelloWorld!H");
    do_send();
}

void bin_to_strhex(unsigned char *bin, unsigned int binsz, char **result)
{
  char hex_str[]= "0123456789abcdef";
  unsigned int i;

  *result = (char *)malloc(binsz * 2 + 1); // attention malloc!
  (*result)[binsz * 2] = 0; // null terminated

  if (!binsz)
    return; // malloc failed

  for (i = 0; i < binsz; i++)
    {
      (*result)[i * 2 + 0] = hex_str[(bin[i] >> 4) & 0x0F];
      (*result)[i * 2 + 1] = hex_str[bin[i] & 0x0F];
    }
}
void btox(char *xp, const char *bb, int n)
{
    const char xx[]= "0123456789ABCDEF";
    while (--n >= 0) xp[n] = xx[(bb[n>>1] >> ((1 - (n&1)) << 2)) & 0xF];
}

void do_send() {
  delay(2);
    switch(STATE){
        case SEND_PING:
            Serial.println("SEND PING");
            sendPing();
            break;
        case COLLECT_DATA:
            Serial.println("COLLECT DATA");
            collectData();
            break;
        case SIGN_TRANSACTION:
            Serial.println("SIGN_TRANSACTION");
            signTranasaction();
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
      Serial.print("SIZE OF DATA ");
      Serial.print(sizeof(data));
      Serial.print("\n");
      byte hash[32];

      byte byteTxCnt[] = {(txCnt>>24)&0xFF,(txCnt>>16)&0xFF,(txCnt>>8)&0xFF,(txCnt)&0xFF};
      byte byteTxFee[] = {(txFee>>56)&0xFF,(txFee>>48)&0xFF,(txFee>>40)&0xFF,(txFee>>32)&0xFF,(txFee>>24)&0xFF,(txFee>>16)&0xFF,(txFee>>8)&0xFF,(txFee)&0xFF};

      SHA3_256* sha = new SHA3_256();
      int sizeTx = sizeof(walletPubKey)+sizeof(publicKey)+sizeof(byteTxCnt)+sizeof(byteTxFee)+sizeof(Header)+sizeof(data);
      byte toSign[sizeTx];

      sha->update(walletPubKey,sizeof(walletPubKey));
      sha->finalize(hash,sizeof(hash));

      int start = 0;
      //strcat(request,"\"WalletPubKey\":");
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

      //start = start + sizeof(hash);
      for (int i = start; i < start + sizeof(byteTxCnt); i++ ){
        toSign[i] = byteTxCnt[i-start];
      }

      //start = start + sizeof(byteTxCnt);
      for (int i = start; i < start + sizeof(byteTxFee); i++ ){
        toSign[i] = byteTxFee[i-start];

      }

      //start = start + sizeof(byteTxFee);
      for (int i = start; i < start+sizeof(Header); i++ ){
        toSign[i] = Header;

      }

      start = start + 1;
      for (int i = start; i < start +sizeof(data); i++ ){
        toSign[i] = data[i-start];

      }

          //Serial.println("Size of request"); Serial.println(sizeof(request));
          //Serial.println("Size of not casted data"); Serial.println(sizeof(toSign));

     sha->update(toSign,sizeof(toSign));
     sha->finalize(hash,sizeof(hash));



    Serial.println("BEFORE SIGNING");
    Ed25519::sign(signature, privateKey, publicKey, hash, sizeof(hash));

    Serial.println("TRANSACTION SIGNED");
    for(int i=0;i<sizeof(signature);i++){
                Serial.print(signature[i]); Serial.print(" ");
      }


          uint8_t zerosCounter = 1;
        int zerosPosition[100];
        char toSignAndSignature[sizeof(toSign)+sizeof(signature)];
        Serial.println("AKSDHAKSDHBGASGDAHJSGDADHJG  ");
        Serial.print(sizeof(toSign)+sizeof(signature));
        //memcpy(toSignAndSignature, data, sizeof(data));
        //strcat(toSignAndSignature, signature);
        for(int i =0;i<sizeof(toSignAndSignature);i++){
          if(i<sizeof(toSign)){
            toSignAndSignature[i] = toSign[i];
            }else{
               toSignAndSignature[i] = signature[i-sizeof(toSign)];
              }
          }
  for(int x =0; x<sizeof(toSignAndSignature);x++){
      if(toSignAndSignature[x]==0){
        zerosPosition[zerosCounter-1] = x;
        zerosCounter++;
        toSignAndSignature[x]=x;
        }

    }
    Serial.print("ZEROOOO");
    Serial.print(zerosCounter);
    char request[1+sizeof(zerosPosition)+sizeof(toSignAndSignature)+sizeof(publicKey)+ sizeof(walletPubKey)];
    request[0] = zerosCounter;
    for(int k = 0; k< zerosCounter; k++){
      request[k+1] = zerosPosition[k];
      }
    //strcat(request, zerosPosition);
    strcat(request, toSignAndSignature);
    strcat(request, publicKey);
    //strcat(request, walletPubKey);
    //strcat(request, signature);
    Serial.print("\n Size of request: ");Serial.print(sizeof(request));
    Serial.print("\n Should be: ");Serial.print(sizeof(toSign)+sizeof(zerosCounter)+sizeof(signature));
    //delay(1000);
    request[sizeof(request)-1]='\0';
              Serial.println("\n s TRANSACTION SE NDDDDDDDDDDDDDDD");

        node.sendDataUDP(request);

                    delay(2000);

    //TODO update only if transaction is successfull
    txCnt = txCnt + 1;



      //node.sendDataUDP(wP);
      //Serial.println("SENT ASDHADAS");
      //delay(3000);
      //STATE = SEND_PING;
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