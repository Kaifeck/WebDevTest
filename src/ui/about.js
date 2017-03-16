import React from 'react';
import { observer, inject } from "mobx-react";


export default inject("sessionStore")(
    observer(function({sessionStore}){
        const currentUser = (window.currentUser = sessionStore.currentUser);
        return (
            <div>
                <h2>User {currentUser.login}</h2>
                <h4>Follower {currentUser.followers}</h4>
            </div>
        )
    })
);