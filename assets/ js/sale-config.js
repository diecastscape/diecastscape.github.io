export function isSaleLive(){

  if(window.SALE_CONFIG?.enabled === true){
    return true;
  }

  if(window.SALE_CONFIG?.start){
    const now = new Date();
    const start = new Date(window.SALE_CONFIG.start);
    return now >= start;
  }

  return false;
}
