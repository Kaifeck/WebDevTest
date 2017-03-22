import MobxReactForm from "mobx-react-form";
import React from "react";
import { observer, Provider, inject } from "mobx-react";
import { extendObservable } from "mobx";
import { fromPromise, PENDING, REJECTED, FULFILLED } from "mobx-utils";
import { Button, Intent, Toaster, Position, Spinner } from "@blueprintjs/core";
import validatorjs from "validatorjs";
import FormInput from './formInput';

const plugins = { dvr: validatorjs };

const fields = [
    {
        name: "title",
        label: "Title",
        placeholder: "Issue Title",
        rules: "required|string|between:5,10"
    },
    {
        name: "text",
        label: "Text",
        placeholder: "Issue Description",
        rules: "required|string|between:5,25"
    }
];

class IssueForm extends MobxReactForm {
    constructor(fields, options, issueStore, repo) {
        super(fields, options);
        this.issueStore = issueStore;
        this.repo = repo;

        extendObservable(this, {
            issuePostDeferred: fromPromise(Promise.resolve())
        });
    }

    onSuccess(form) {
        const { title, text } = form.values();
        const resultPromise = this.issueStore.postIssue(this.repo, title, text);
        resultPromise
            .then(() => Toaster.create({ position: Position.TOP }).show({
                message: "issue posted",
                intent: Intent.SUCCESS
            }))
            .catch(() => Toaster.create({ position: Position.TOP }).show({
                message: "failed posting issue",
                action: { text: "retry", onClick: () => form.submit() },
                intent: Intent.DANGER
            }));
        this.issuePostDeferred = fromPromise(resultPromise);
    }
}

const FormComponent = inject("form")(
    observer(function({ form }) {
        return (
            <form onSubmit={form.onSubmit}>

                <FormInput form={form} field="title" />
                <FormInput form={form} field="text" />

                {form.issuePostDeferred.case({
                    pending: () => <Button type="submit" loading={true} text="submit" />,
                    rejected: () => (
                        <Button type="submit" className="pt-icon-repeat" text="submit" />
                    ),
                    fulfilled: () => (
                        <Button type="submit" onClick={form.onSubmit} text="submit" />
                    )
                })}
                <Button onClick={form.onClear} text="clear" />
                <Button onClick={form.onReset} text="reset" />

                <p>{form.error}</p>
            </form>
        );
    })
);

const IssueTable = ({issues, editTitle, editBody, updateIssue}) => {
    return (
        <div>
            <div>
                <input  onChange={editTitle}/><input onChange={editBody}/>
            </div>
            <table>
                <thead>
                <tr>
                    <td>Title</td>
                    <td>Body</td>
                    <td>Edit</td>
                </tr>
                </thead>
                <tbody>
                {
                    issues.map((value) => {
                        return <IssueComponent title={value.title} body={value.body} onclick={updateIssue} number={value.number}/>
                    })
                }
                </tbody>
            </table>
        </div>
    )
};

const IssueComponent = ({title, body, onclick, number}) => {
    return (
        <tr>
            <td>{title}</td><td>{body}</td><td><Button value={number} onClick={onclick} text="edit"/></td>
        </tr>
    )
};

export default inject("issueStore", "sessionStore", "viewStore")(
    observer(
        class IssueFormComponent extends React.Component {
            constructor({ issueStore, route }) {
                super();
                issueStore.fetchIssues(route.params.repo);
                this.state = {
                    form: new IssueForm({ fields }, { plugins }, issueStore, route.params.repo),
                    editTitle: null,
                    editBody: null
                };
            }
            updateTitle = (e) => {
                this.setState({
                    editTitle: e.target.value
                })
            };
            updateBody = (e) => {
                this.setState({
                    editBody: e.target.value
                })
            };
            updateEntry = (number) => {
                const {route, issueStore} = this.props;
                issueStore.updateIssue(
                    route.params.repo, this.state.editTitle, this.state.editBody, number.target.value
                )
            };
            renderIssueList() {
                const {sessionStore, issueStore, viewStore} = this.props;

                if (sessionStore.authenticated) {
                    const issueDeferred = issueStore.issueDeferred;
                    const state = issueDeferred.state;
                    switch (state) {
                        case PENDING: {
                            console.log('pending');
                            return <Spinner />;
                        }
                        case REJECTED: {
                            return (
                                <div className="pt-non-ideal-state">
                                    <div
                                        className="pt-non-ideal-state-visual pt-non-ideal-state-icon"
                                    >
                                        <span className="pt-icon pt-icon-error" />
                                    </div>
                                    <h4 className="pt-non-ideal-state-title">Error occured</h4>
                                    <Button onClick={issueStore.fetchIssues} text="retry"/>
                                    <div className="pt-non-ideal-state-description">
                                    </div>
                                </div>
                            );
                        }
                        case FULFILLED: {
                            const issues = issueDeferred.value;
                            return <IssueTable issues={issues} editTitle={this.updateTitle} editBody={this.updateBody} updateIssue={this.updateEntry}/>;
                        }
                        default: {
                            console.error("deferred state not supported", state);
                        }
                    }
                } else {
                    return <h1>NOT AUTHENTICATED </h1>;
                }
            }
            render() {
                const { form } = this.state;
                const {route} = this.props;

                return (
                    <Provider form={form}>
                        <div>
                            <h3>issue for {route.params.repo}</h3>
                            <FormComponent />
                            {this.renderIssueList()}
                        </div>
                    </Provider>
                );
            }
        }
    )
);
