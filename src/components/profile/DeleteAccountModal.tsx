import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { requestAccountDeletion } from "../../api/profileApi";

interface Props{
  visible:boolean;
  onClose:()=>void;
  onSuccess?:()=>Promise<void>|void;
}

export function DeleteAccountModal({visible,onClose,onSuccess}:Props){

  const [passwordActual,setPasswordActual]=useState("");
  const [motivo,setMotivo]=useState("");
  const [confirmacion,setConfirmacion]=useState("");
  const [loading,setLoading]=useState(false);

  const formValid=useMemo(()=>(
    passwordActual.trim().length>0 &&
    confirmacion.trim().toUpperCase()==="ELIMINAR"
  ),[passwordActual,confirmacion]);

  function reset(){
    setPasswordActual("");
    setMotivo("");
    setConfirmacion("");
  }

  async function submit(){

    if(!formValid){
      Alert.alert(
        "Datos incompletos",
        "Ingresá tu contraseña y escribí exactamente ELIMINAR."
      );
      return;
    }

    Alert.alert(
      "Eliminar cuenta",
      "Recibirás un correo para confirmar la eliminación de la cuenta.",
      [
        {text:"Cancelar",style:"cancel"},
        {
          text:"Continuar",
          style:"destructive",
          onPress:async()=>{
            try{
              setLoading(true);

              const response=await requestAccountDeletion({
                passwordActual,
                motivo:motivo.trim()||undefined,
                confirmacion:"ELIMINAR",
              });

              Alert.alert(
                "Solicitud registrada",
                response.message
              );

              reset();
              onClose();

              await onSuccess?.();

            }catch(error:any){

              const message=
                error?.response?.data?.message ??
                error?.message ??
                "No fue posible registrar la solicitud.";

              Alert.alert("Error",message);

            }finally{
              setLoading(false);
            }
          }
        }
      ]
    );
  }

  return(
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>

          <Text style={styles.title}>
            Eliminar cuenta
          </Text>

          <Text style={styles.description}>
            Esta acción requiere confirmar tu identidad.
            Luego recibirás un correo electrónico para
            confirmar definitivamente la eliminación.
          </Text>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            <Text style={styles.label}>
              Contraseña actual
            </Text>

            <TextInput
              secureTextEntry
              value={passwordActual}
              onChangeText={setPasswordActual}
              placeholder="********"
              placeholderTextColor="#777"
              style={styles.input}
            />

            <Text style={styles.label}>
              Motivo (opcional)
            </Text>

            <TextInput
              multiline
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Contanos el motivo..."
              placeholderTextColor="#777"
              style={[styles.input,styles.multiline]}
            />

            <Text style={styles.label}>
              Escribí ELIMINAR
            </Text>

            <TextInput
              autoCapitalize="characters"
              value={confirmacion}
              onChangeText={setConfirmacion}
              placeholder="ELIMINAR"
              placeholderTextColor="#777"
              style={styles.input}
            />

          </ScrollView>

          <View style={styles.buttons}>

            <Pressable
              style={styles.cancelButton}
              onPress={()=>{
                reset();
                onClose();
              }}
            >
              <Text style={styles.cancelText}>
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              disabled={!formValid||loading}
              style={[
                styles.deleteButton,
                (!formValid||loading)&&styles.disabled
              ]}
              onPress={submit}
            >
              {loading
                ?<ActivityIndicator color="#fff"/>
                :<Text style={styles.deleteText}>
                    Solicitar eliminación
                  </Text>}
            </Pressable>

          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles=StyleSheet.create({
overlay:{flex:1,backgroundColor:"rgba(0,0,0,.75)",justifyContent:"center",padding:20},
card:{backgroundColor:"#111",borderRadius:24,padding:22,maxHeight:"90%"},
title:{color:"#fff",fontSize:24,fontWeight:"900"},
description:{color:"#BBB",marginTop:10,lineHeight:22},
label:{color:"#FFD166",marginTop:18,marginBottom:8,fontWeight:"800"},
input:{backgroundColor:"#1C1C1C",borderRadius:14,padding:14,color:"#fff",borderWidth:1,borderColor:"rgba(255,255,255,.08)"},
multiline:{minHeight:90,textAlignVertical:"top"},
buttons:{flexDirection:"row",marginTop:24,gap:12},
cancelButton:{flex:1,backgroundColor:"#2A2A2A",padding:14,borderRadius:14,alignItems:"center"},
deleteButton:{flex:1,backgroundColor:"#D62828",padding:14,borderRadius:14,alignItems:"center"},
disabled:{opacity:.45},
cancelText:{color:"#fff",fontWeight:"800"},
deleteText:{color:"#fff",fontWeight:"900"}
});