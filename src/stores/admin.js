import { defineStore } from "pinia";
import { ref } from "vue";
const useAdminStore=defineStore('admin',()=>{
    const isCollapse=ref(false)
    const toggleCollapse=()=>{
        isCollapse.value=!isCollapse.value
    }
    return{
        isCollapse,
        toggleCollapse
    }
})
export {useAdminStore}