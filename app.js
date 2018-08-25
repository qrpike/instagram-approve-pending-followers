#!/usr/bin/env node

const lodash = require('lodash')
const Promise = require('bluebird')
var Client = require('instagram-private-api').V1

var program = require('commander')
let session = null

const everyMinutes = 10
let intervalFunc = null

program
	.version('0.1.0')
	.option('-u, --username [username]', 'Username', '')
	.option('-p, --password [password]', 'Password', '')
	.parse( process.argv )

if( lodash.isEmpty( program.username ) || lodash.isEmpty( program.password ) ){
	throw(new Error('Must supply -u {username} and -p {password}'))
}

var device = new Client.Device('default')
var storage = new Client.CookieFileStorage(`./cookie-${program.username}.json`)

let pendingCount = 0
function DoApprovals(){
	return Client.Relationship.pendingFollowers( session )
		.then(( pendingFollowers ) => {
			console.log('Pending Count:', pendingFollowers.length)
			pendingCount = pendingFollowers.length
			return Promise.mapSeries( pendingFollowers, ( pending ) => {
				console.log('Approving:', pending._params.username)
				return Promise.delay(200).then( pending.approvePending.bind( pending ) )
			}).then(() => {
				if( pendingCount != 0 ){
					console.log('Approvals done, still more so continue until pending = 0')
					return DoApprovals()
				}
				setTimeoutContinue()
			})
		})
}


function setTimeoutContinue(){
	clearTimeout( intervalFunc )
	intervalFunc = setTimeout(() => {
		console.log('interval')
		DoApprovals()
	}, 1000 * 60 * everyMinutes )
}

// Login and go
Client.Session.create(device, storage, program.username, program.password)
	.then(( ses ) => {
		session = ses
		DoApprovals()
	})
	.catch(( err ) => {
		console.log('err:', err)
	})

