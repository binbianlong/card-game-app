import { useEffect, useState } from "react";

const nicknameStorageKey = "card-room.nickname";
const nicknameChangeEventName = "card-room:nickname-change";

function getStoredNickname() {
  if (typeof window === "undefined") {
    return null;
  }

  const nickname = window.localStorage.getItem(nicknameStorageKey)?.trim() ?? "";

  return nickname.length === 0 ? null : nickname;
}

function setStoredNickname(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  const nickname = value.trim();

  if (nickname.length === 0) {
    window.localStorage.removeItem(nicknameStorageKey);
  } else {
    window.localStorage.setItem(nicknameStorageKey, nickname);
  }

  window.dispatchEvent(new Event(nicknameChangeEventName));
}

function useNickname() {
  const [nickname, setNicknameState] = useState(getStoredNickname);

  useEffect(() => {
    function syncNickname() {
      setNicknameState(getStoredNickname());
    }

    window.addEventListener("storage", syncNickname);
    window.addEventListener(nicknameChangeEventName, syncNickname);

    return () => {
      window.removeEventListener("storage", syncNickname);
      window.removeEventListener(nicknameChangeEventName, syncNickname);
    };
  }, []);

  return {
    displayName: nickname ?? "",
    nickname,
    setNickname: setStoredNickname,
  };
}

export { getStoredNickname, useNickname };
