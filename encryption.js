
let crypt_flag = true;
let buffer_pass = "";
let url = new URL(window.location.href);
let params = url.searchParams;
if(params.get("pass") == null){
    buffer_pass = window.prompt("パスワードを入力してください", "");
}
else{
    buffer_pass = params.get("pass");
}
if(params.get("staffid") == null){
    input_staff_id = window.prompt("スタッフIDを入れてください", "");
}
else{
    input_staff_id = params.get("staffid");
}

// パスフレーズ（暗号鍵）
let passPhrase = buffer_pass;
let errored = false;
function fdecrypt(data_str){
    if(errored == true){
        return "";
    }
    let txt_dexrypted = "";
    try {
        if(crypt_flag == true){
            let decrypted = CryptoJS.AES.decrypt( data_str , passPhrase );
            txt_dexrypted = decrypted.toString(CryptoJS.enc.Utf8);
        }
        else{
            txt_dexrypted = data_str;
        }
      }
      catch (exception_var) {
        alert("エラー!");
        errored = true;
      }
    return txt_dexrypted;
}
function fencrypt(data_str){
    let txt_encrypted = "";
    if(crypt_flag == true){
        let encrypted = CryptoJS.AES.encrypt( data_str , passPhrase );
        txt_encrypted = encrypted.toString();
    }
    else{
        txt_encrypted = data_str;
    }
    return txt_encrypted;
}

function fencrypt_key(data_str, crypt_key){
    let txt_encrypted = "";
    if(crypt_flag == true){
        let encrypted = CryptoJS.AES.encrypt( data_str , crypt_key );
        txt_encrypted = encrypted.toString();
    }
    else{
        txt_encrypted = data_str;
    }
    return txt_encrypted;
}
function fdecrypt_key(data_str, crypt_key){
    let txt_dexrypted = "";
    if(crypt_flag == true){
        let decrypted = CryptoJS.AES.decrypt( data_str , crypt_key );
        txt_dexrypted = decrypted.toString(CryptoJS.enc.Utf8);
    }
    else{
        txt_dexrypted = data_str;
    }
    return txt_dexrypted;
}
