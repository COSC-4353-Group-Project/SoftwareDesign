//Validation for history entries
//I am basically copying what Justin has, but modifying it for history

export const STATUSES = ['Entered', 'Canceled', 'Done']
export const NAME_MAX = 100

export function validateHistory(body) {
    const errors = {service: '', date: '', bribe: '', status: ''}

    if(typeof body != 'object' || body === null){
        body = {}
    }

    //Service name same as service validator's service name
    if(body.service === undefined || body.service === null){
        errors.service = 'Service name is required.'
    }
    else if(typeof body.service !== 'string'){
        errors.service = 'Service name must be text.'
    }
    else{
        const service = body.service.trim()
        if(service === ''){
            errors.service = 'Service name is required.'
        }
        else if(service.length > NAME_MAX){
            errors.service = `Service name must be ${NAME_MAX} characters or fewer.`
        }
    }

    //Update to reflect date from DB when built - for now, is just a string
    if(body.date === undefined || body.date === null){
        errors.date = 'Date is required'
    }
    else if(typeof body.date !== 'string'){
        errors.date = 'Date must be a valid string input'
    }
    else{
        const date = body.date.trim()
        if(date === ''){
            errors.date = 'Date is required'
        }
    }

    //Change bribe amount to be float
    if(body.bribe === undefined || body.bribe === null){
        errors.bribe = 'Bribe amount was expected'
    }
    //If bribe amount is not a number or less than $0.00, reject
    else if(typeof body.bribe !== 'number' || Number.isNaN(body.bribe) || body.bribe < 0.00){
        errors.bribe = 'Bribe amount expected to be a value greater than 0.00.'
    }

    if(body.status === undefined || body.status === null){
        errors.status = 'Queue status must be confirmed'
    }
    else if(typeof body.status !== 'string' ){
        errors.status = 'Status must be a valid string input.'
    }

    return errors
}

export function hasErrors(errors){
    return Object.values(errors).some((message) => message !== '')
}